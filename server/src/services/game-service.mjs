import { randomInt, randomUUID } from 'node:crypto';
import { badRequest, conflict } from '../lib/errors.mjs';

/** Fisher–Yates con generatore crittografico (iniettabile nei test). */
function shuffle(items, random) {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = random(i + 1);
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * Motore di gioco autoritativo: il server sceglie immagini e didascalie, misura il tempo,
 * valuta le risposte e calcola i punti. Il client riceve le soluzioni di un round solo
 * dopo aver risposto, e non può inviare punteggi: niente più partite "truccate".
 *
 * Le partite in corso vivono in memoria (sono effimere e piccole); quelle concluse dagli
 * utenti registrati vengono salvate nel database. Tutti i metodi sono sincroni e quindi
 * atomici rispetto all'event loop: due risposte concorrenti non possono essere accettate entrambe.
 */
export class GameService {
  #games = new Map();
  #timer;

  /**
   * @param {{
   *   memes: ReturnType<typeof import('../repositories/memes.mjs').createMemeRepository>,
   *   games: ReturnType<typeof import('../repositories/games.mjs').createGameRepository>,
   *   rules: typeof import('../config.mjs').GAME_RULES,
   *   clock?: { now: () => number },
   *   random?: (max: number) => number,
   * }} deps
   */
  constructor({ memes, games, rules, clock = Date, random = randomInt }) {
    this.memes = memes;
    this.games = games;
    this.rules = rules;
    this.clock = clock;
    this.random = random;
    this.#timer = setInterval(() => this.sweep(), 60_000);
    this.#timer.unref();

    const smallestDeck = Math.min(
      ...memes.imageIds().map((id) => Math.min(memes.correctCaptionIds(id).length, memes.wrongCaptionIds(id).length)),
    );
    const wrongPerRound = rules.captionsPerRound - rules.correctCaptionsPerRound;
    if (memes.imageIds().length < rules.roundsPerGame || smallestDeck < Math.min(rules.correctCaptionsPerRound, wrongPerRound)) {
      throw new Error('Contenuti di gioco insufficienti per le regole configurate.');
    }
  }

  get activeGames() {
    return this.#games.size;
  }

  /** Avvia una nuova partita: 3 round per gli utenti registrati, 1 per gli ospiti. */
  start({ userId = null }) {
    const now = this.clock.now();
    const totalRounds = userId === null ? this.rules.roundsPerGuestGame : this.rules.roundsPerGame;
    const game = {
      id: randomUUID(),
      userId,
      totalRounds,
      imageIds: shuffle(this.memes.imageIds(), this.random).slice(0, totalRounds),
      rounds: [],
      createdAt: now,
      touchedAt: now,
      finishedAt: null,
      savedGameId: null,
    };
    this.#deal(game);
    this.#store(game);
    return game;
  }

  /** Recupera una partita solo se appartiene a chi la chiede (stessa sessione e stesso utente). */
  find(gameId, userId = null) {
    const game = typeof gameId === 'string' ? this.#games.get(gameId) : undefined;
    if (!game || game.userId !== userId) return null;
    const now = this.clock.now();
    if (now - game.touchedAt > this.rules.idleGameTtlMs) {
      this.#games.delete(game.id);
      return null;
    }
    game.touchedAt = now;
    return game;
  }

  /** Chiude per timeout il round in corso se il tempo è scaduto (es. dopo un refresh della pagina). */
  refresh(game) {
    this.#expireIfLate(game);
    return game;
  }

  /**
   * Registra la risposta al round in corso. `captionId: null` significa tempo scaduto;
   * una risposta che arriva oltre il limite (più la tolleranza di rete) vale come tempo scaduto.
   * @param {{ position: number, captionId: number | null }} answer
   */
  answer(game, { position, captionId }) {
    const round = this.#current(game);
    if (round.answer) throw conflict('Hai già risposto a questo round.');
    if (position !== round.position) throw conflict('Questo round non è più in corso.');
    if (captionId !== null && !round.captionIds.includes(captionId)) {
      throw badRequest('La didascalia scelta non fa parte di questo round.');
    }
    this.#resolve(game, round, captionId);
    return game;
  }

  /**
   * Distribuisce il round `position`. Idempotente: se quel round è già in corso (doppio click)
   * restituisce semplicemente lo stato attuale.
   */
  next(game, { position }) {
    this.#expireIfLate(game);
    const round = this.#current(game);
    if (position === round.position) return game;
    if (game.finishedAt) throw conflict('La partita è già terminata.');
    if (position !== round.position + 1) throw conflict('Round non valido.');
    if (!round.answer) throw conflict('Rispondi prima di passare al round successivo.');
    this.#deal(game);
    return game;
  }

  abandon(gameId) {
    if (typeof gameId === 'string') this.#games.delete(gameId);
  }

  /** Stato pubblico della partita: le soluzioni compaiono solo per i round già giocati. */
  view(game) {
    const round = this.#current(game);
    const results = game.rounds.filter((r) => r.answer).map((r) => this.#resultView(r));
    const upcomingId = round.answer && !game.finishedAt ? game.imageIds[round.position] : undefined;
    return {
      id: game.id,
      mode: game.userId === null ? 'guest' : 'full',
      status: game.finishedAt ? 'finished' : 'playing',
      totalRounds: game.totalRounds,
      roundDurationMs: this.rules.roundDurationMs,
      pointsPerCorrectAnswer: this.rules.pointsPerCorrectAnswer,
      score: results.reduce((sum, r) => sum + r.points, 0),
      maxScore: game.totalRounds * this.rules.pointsPerCorrectAnswer,
      round: {
        position: round.position,
        image: this.memes.getImage(round.imageId),
        captions: round.captionIds.map((id) => this.memes.getCaption(id)),
        remainingMs: round.answer ? 0 : Math.max(0, round.dealtAt + this.rules.roundDurationMs - this.clock.now()),
        result: round.answer ? this.#resultView(round) : null,
      },
      results,
      /** Immagine del prossimo round, per precaricarla mentre si leggono i risultati. */
      upcomingImage: upcomingId === undefined ? null : this.memes.getImage(upcomingId),
      savedGameId: game.savedGameId,
    };
  }

  /** Rimuove le partite inattive. */
  sweep() {
    const cutoff = this.clock.now() - this.rules.idleGameTtlMs;
    for (const [id, game] of this.#games) if (game.touchedAt < cutoff) this.#games.delete(id);
  }

  close() {
    clearInterval(this.#timer);
    this.#games.clear();
  }

  #current(game) {
    return game.rounds[game.rounds.length - 1];
  }

  #store(game) {
    if (this.#games.size >= this.rules.maxActiveGames) this.sweep();
    // Ancora pieno: scarta le partite più vecchie (la Map mantiene l'ordine di inserimento).
    for (const id of this.#games.keys()) {
      if (this.#games.size < this.rules.maxActiveGames) break;
      this.#games.delete(id);
    }
    this.#games.set(game.id, game);
  }

  #deal(game) {
    const position = game.rounds.length + 1;
    const imageId = game.imageIds[position - 1];
    const { correctCaptionsPerRound, captionsPerRound } = this.rules;
    const correctIds = shuffle(this.memes.correctCaptionIds(imageId), this.random).slice(0, correctCaptionsPerRound);
    const wrongIds = shuffle(this.memes.wrongCaptionIds(imageId), this.random).slice(
      0,
      captionsPerRound - correctCaptionsPerRound,
    );
    game.rounds.push({
      position,
      imageId,
      captionIds: shuffle([...correctIds, ...wrongIds], this.random),
      correctIds,
      dealtAt: this.clock.now(),
      answer: null,
    });
  }

  #expireIfLate(game) {
    const round = this.#current(game);
    if (round.answer || game.finishedAt) return;
    const deadline = round.dealtAt + this.rules.roundDurationMs + this.rules.answerGraceMs;
    if (this.clock.now() > deadline) this.#resolve(game, round, null);
  }

  #resolve(game, round, captionId) {
    const elapsed = Math.max(0, this.clock.now() - round.dealtAt);
    const late = elapsed > this.rules.roundDurationMs + this.rules.answerGraceMs;
    const timedOut = captionId === null || late;
    round.answer = {
      captionId: timedOut ? null : captionId,
      isCorrect: !timedOut && round.correctIds.includes(captionId),
      timedOut,
      responseMs: Math.min(elapsed, this.rules.roundDurationMs),
    };
    if (round.position === game.totalRounds) this.#finish(game);
  }

  #finish(game) {
    game.finishedAt = this.clock.now();
    if (game.userId === null) return;
    const rounds = game.rounds.map((r) => ({
      position: r.position,
      imageId: r.imageId,
      captionId: r.answer.captionId,
      isCorrect: r.answer.isCorrect,
      timedOut: r.answer.timedOut,
      responseMs: r.answer.responseMs,
    }));
    game.savedGameId = this.games.save({
      userId: game.userId,
      playedAt: new Date(game.finishedAt).toISOString(),
      score: rounds.filter((r) => r.isCorrect).length * this.rules.pointsPerCorrectAnswer,
      rounds,
    });
  }

  #resultView(round) {
    const { answer } = round;
    return {
      position: round.position,
      image: this.memes.getImage(round.imageId),
      selectedCaption: answer.captionId === null ? null : this.memes.getCaption(answer.captionId),
      correctCaptions: round.correctIds.map((id) => this.memes.getCaption(id)),
      isCorrect: answer.isCorrect,
      timedOut: answer.timedOut,
      responseMs: answer.responseMs,
      points: answer.isCorrect ? this.rules.pointsPerCorrectAnswer : 0,
    };
  }
}
