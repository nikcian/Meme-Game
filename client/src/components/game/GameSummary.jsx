import { useEffect, useEffectEvent, useRef } from 'react';
import { Link } from 'react-router';
import { useAuth } from '../../context/AuthContext.jsx';
import { usePreferences } from '../../context/PreferencesContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { formatSeconds, resultEmojis, verdictFor } from '../../lib/format.js';
import { Confetti } from '../Confetti.jsx';
import { Spinner } from '../Feedback.jsx';
import { Icon } from '../Icon.jsx';
import { MemeCard } from '../MemeCard.jsx';
import { ScoreCounter } from './ScoreCounter.jsx';

function ResultCard({ result, points }) {
  const shown = result.isCorrect ? result.selectedCaption : result.correctCaptions[0];
  return (
    <article className={`result-card result-card--${result.isCorrect ? 'win' : 'lose'}`}>
      <MemeCard image={result.image} caption={shown.text} />
      <div className="result-card__body">
        <p className="result-card__meta">
          <span>Round {result.position}</span>
          {result.isCorrect ? (
            <span className="chip chip--green">+{points} punti</span>
          ) : (
            <span className={`chip ${result.timedOut ? 'chip--orange' : 'chip--red'}`}>
              {result.timedOut ? 'Tempo scaduto' : '0 punti'}
            </span>
          )}
          {result.isCorrect && (
            <span className="result-card__time">
              <Icon name="clock" size={15} /> {formatSeconds(result.responseMs)}
            </span>
          )}
        </p>
        {!result.isCorrect && (
          <>
            {result.selectedCaption && (
              <p className="result-card__wrong">
                <span className="visually-hidden">La tua risposta: </span>
                <s>{result.selectedCaption.text}</s>
              </p>
            )}
            <p className="result-card__label">Le risposte giuste erano:</p>
            <ul className="result-card__answers">
              {result.correctCaptions.map((caption) => (
                <li key={caption.id}>
                  <Icon name="check" size={16} strokeWidth={3} /> {caption.text}
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </article>
  );
}

async function shareText(text) {
  if (navigator.share) {
    try {
      await navigator.share({ title: 'Meme Game', text });
      return 'shared';
    } catch (error) {
      if (error.name === 'AbortError') return 'cancelled';
    }
  }
  await navigator.clipboard.writeText(text);
  return 'copied';
}

/** Riepilogo di fine partita: verdetto, punteggio animato, meme indovinati e risposte giuste. */
export function GameSummary({ game, onPlayAgain, busy }) {
  const { status } = useAuth();
  const { play } = usePreferences();
  const toast = useToast();
  const verdict = verdictFor(game.score, game.maxScore);
  const won = game.results.filter((r) => r.isCorrect);
  const missed = game.results.filter((r) => !r.isCorrect);
  const celebrate = useEffectEvent(() => play(game.score > 0 ? 'victory' : 'timeout'));
  // Un solo suono per partita, anche quando l'effect viene rieseguito (StrictMode in sviluppo).
  const celebratedFor = useRef(null);

  useEffect(() => {
    if (celebratedFor.current === game.id) return;
    celebratedFor.current = game.id;
    celebrate();
  }, [game.id]);

  async function handleShare() {
    const text = `Meme Game 🎭 ${game.score}/${game.maxScore} punti\n${resultEmojis(game.results)}\n${window.location.origin}`;
    try {
      const outcome = await shareText(text);
      if (outcome === 'copied') toast.success('Risultato copiato negli appunti!');
    } catch {
      toast.error('Non è stato possibile condividere il risultato.');
    }
  }

  return (
    <section className="summary" aria-labelledby="summary-title">
      {game.score > 0 && <Confetti burst={game.score === game.maxScore ? 1.6 : 1} />}

      <div className={`summary__hero card summary__hero--${verdict.tone}`}>
        <p className="summary__kicker">Partita conclusa</p>
        <h1 id="summary-title" className={`summary__verdict sticker sticker--${verdict.tone}`}>
          {verdict.title}
        </h1>
        <p className="summary__score">
          <ScoreCounter value={game.score} from={0} duration={1100} className="summary__points" />
          <span className="summary__max">/ {game.maxScore} punti</span>
        </p>
        <p className="summary__emoji" aria-hidden="true">
          {resultEmojis(game.results)}
        </p>
        <p className="summary__lead">
          {won.length === 0
            ? 'Nessun meme indovinato stavolta. Capita anche ai migliori: la rivincita è a un click.'
            : `Hai indovinato ${won.length} meme su ${game.totalRounds}.`}
          {status === 'authenticated' && game.savedGameId && ' La partita è stata salvata nel tuo storico.'}
        </p>
        <div className="summary__actions">
          <button type="button" className="btn btn--primary btn--lg" onClick={onPlayAgain} disabled={busy}>
            {busy ? <Spinner label="Nuova partita…" /> : <Icon name="refresh" />} Gioca ancora
          </button>
          <button type="button" className="btn btn--lg" onClick={handleShare}>
            <Icon name="share" /> Condividi
          </button>
          {status === 'authenticated' && (
            <Link to="/history" className="btn btn--lg btn--ghost" viewTransition>
              <Icon name="history" /> Storico
            </Link>
          )}
        </div>
      </div>

      {game.mode === 'guest' && status !== 'authenticated' && (
        <aside className="upsell card">
          <div>
            <h2 className="upsell__title">Ti è piaciuto? Fai sul serio.</h2>
            <p>Con un account giochi partite da tre round, tieni traccia dei progressi ed entri in classifica.</p>
          </div>
          <div className="upsell__actions">
            <Link to="/register" className="btn btn--accent" viewTransition>
              <Icon name="user-plus" /> Crea un account
            </Link>
            <Link to="/login" className="btn btn--ghost" viewTransition>
              Accedi
            </Link>
          </div>
        </aside>
      )}

      {won.length > 0 && (
        <div className="summary__section">
          <h2 className="section-title">
            <Icon name="check" strokeWidth={3} /> Meme indovinati
          </h2>
          <div className="summary__grid">
            {won.map((result) => (
              <ResultCard key={result.position} result={result} points={game.pointsPerCorrectAnswer} />
            ))}
          </div>
        </div>
      )}

      {missed.length > 0 && (
        <div className="summary__section">
          <h2 className="section-title">
            <Icon name="target" /> Da ripassare
          </h2>
          <div className="summary__grid">
            {missed.map((result) => (
              <ResultCard key={result.position} result={result} points={game.pointsPerCorrectAnswer} />
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
