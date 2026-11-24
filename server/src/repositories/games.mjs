import { transaction } from '../db/transaction.mjs';
import { toPublicImage } from './memes.mjs';

const ROUND_COLUMNS = `
  r.gameId, r.position, r.isCorrect, r.timedOut, r.responseMs,
  i.id AS imageId, i.fileName, i.title, i.alt, i.width, i.height,
  c.id AS captionId, c.text AS captionText`;

function toRound(row, pointsPerCorrectAnswer) {
  return {
    position: row.position,
    image: toPublicImage({ ...row, id: row.imageId }),
    caption: row.captionId === null ? null : { id: row.captionId, text: row.captionText },
    isCorrect: row.isCorrect === 1,
    timedOut: row.timedOut === 1,
    responseMs: row.responseMs,
    points: row.isCorrect === 1 ? pointsPerCorrectAnswer : 0,
  };
}

/** Serie più lunga di risposte corrette consecutive. */
function longestStreak(flags) {
  let best = 0;
  let run = 0;
  for (const correct of flags) {
    run = correct ? run + 1 : 0;
    best = Math.max(best, run);
  }
  return best;
}

/**
 * Partite concluse: salvataggio transazionale, storico paginato, statistiche e classifica.
 * @param {import('node:sqlite').DatabaseSync} db
 * @param {{ pointsPerCorrectAnswer: number, roundsPerGame: number }} rules
 */
export function createGameRepository(db, { pointsPerCorrectAnswer, roundsPerGame }) {
  const statements = {
    insertGame: db.prepare('INSERT INTO games (userId, playedAt, score) VALUES (?, ?, ?)'),
    insertRound: db.prepare(
      `INSERT INTO rounds (gameId, position, imageId, captionId, isCorrect, timedOut, responseMs)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    ),
    page: db.prepare(
      'SELECT id, playedAt, score FROM games WHERE userId = ? ORDER BY playedAt DESC, id DESC LIMIT ? OFFSET ?',
    ),
    count: db.prepare('SELECT COUNT(*) AS n FROM games WHERE userId = ?'),
    one: db.prepare('SELECT id, playedAt, score FROM games WHERE id = ? AND userId = ?'),
    roundsOf: db.prepare(
      `SELECT ${ROUND_COLUMNS}
       FROM rounds r
       JOIN images i ON i.id = r.imageId
       LEFT JOIN captions c ON c.id = r.captionId
       WHERE r.gameId IN (SELECT value FROM json_each(?))
       ORDER BY r.gameId, r.position`,
    ),
    totals: db.prepare(
      `SELECT COUNT(*) AS gamesPlayed,
              COALESCE(SUM(score), 0) AS totalScore,
              COALESCE(MAX(score), 0) AS bestScore,
              COALESCE(AVG(score), 0) AS averageScore,
              COALESCE(SUM(score = ?), 0) AS perfectGames,
              MAX(playedAt) AS lastPlayedAt
       FROM games WHERE userId = ?`,
    ),
    roundTotals: db.prepare(
      `SELECT COUNT(*) AS roundsPlayed,
              COALESCE(SUM(r.isCorrect), 0) AS correctAnswers,
              AVG(CASE WHEN r.isCorrect = 1 THEN r.responseMs END) AS averageCorrectMs,
              MIN(CASE WHEN r.isCorrect = 1 THEN r.responseMs END) AS fastestCorrectMs
       FROM rounds r JOIN games g ON g.id = r.gameId
       WHERE g.userId = ?`,
    ),
    roundFlags: db.prepare(
      `SELECT r.isCorrect FROM rounds r JOIN games g ON g.id = r.gameId
       WHERE g.userId = ? ORDER BY g.playedAt, g.id, r.position`,
    ),
    perImage: db.prepare(
      `SELECT i.id, i.fileName, i.title, i.alt, i.width, i.height,
              SUM(r.isCorrect) AS correct, COUNT(*) - SUM(r.isCorrect) AS wrong, COUNT(*) AS played
       FROM rounds r
       JOIN games g ON g.id = r.gameId
       JOIN images i ON i.id = r.imageId
       WHERE g.userId = ?
       GROUP BY i.id`,
    ),
    recent: db.prepare(
      `SELECT id, playedAt, score FROM (
         SELECT id, playedAt, score FROM games WHERE userId = ? ORDER BY playedAt DESC, id DESC LIMIT ?
       ) ORDER BY playedAt, id`,
    ),
    leaderboard: db.prepare(
      `SELECT u.id AS userId, u.name,
              COUNT(g.id) AS gamesPlayed,
              SUM(g.score) AS totalScore,
              MAX(g.score) AS bestScore,
              ROUND(AVG(g.score), 1) AS averageScore,
              RANK() OVER (ORDER BY SUM(g.score) DESC, ROUND(AVG(g.score), 1) DESC) AS rank
       FROM games g JOIN users u ON u.id = g.userId
       GROUP BY u.id
       ORDER BY rank, gamesPlayed, u.id`,
    ),
  };

  function attachRounds(games) {
    if (games.length === 0) return [];
    const byGame = new Map(games.map((g) => [g.id, { ...g, maxScore: roundsPerGame * pointsPerCorrectAnswer, rounds: [] }]));
    for (const row of statements.roundsOf.all(JSON.stringify(games.map((g) => g.id)))) {
      byGame.get(row.gameId).rounds.push(toRound(row, pointsPerCorrectAnswer));
    }
    return [...byGame.values()];
  }

  return {
    /**
     * Salva una partita conclusa con i suoi round in un'unica transazione.
     * @returns {number} id della partita salvata
     */
    save({ userId, playedAt, score, rounds }) {
      return transaction(db, () => {
        const gameId = Number(statements.insertGame.run(userId, playedAt, score).lastInsertRowid);
        for (const r of rounds) {
          statements.insertRound.run(
            gameId,
            r.position,
            r.imageId,
            r.captionId,
            r.isCorrect ? 1 : 0,
            r.timedOut ? 1 : 0,
            r.responseMs,
          );
        }
        return gameId;
      });
    },

    listForUser(userId, { limit, offset }) {
      return attachRounds(statements.page.all(userId, limit, offset));
    },

    countForUser: (userId) => statements.count.get(userId).n,

    /** Restituisce la partita solo se appartiene all'utente indicato (niente accessi incrociati). */
    findForUser(gameId, userId) {
      const game = statements.one.get(gameId, userId);
      return game ? attachRounds([game])[0] : null;
    },

    statsForUser(userId) {
      const maxScore = roundsPerGame * pointsPerCorrectAnswer;
      const totals = statements.totals.get(maxScore, userId);
      const rounds = statements.roundTotals.get(userId);
      const perImage = statements.perImage.all(userId);
      const best = (key) =>
        perImage
          .filter((row) => row[key] > 0)
          .sort((a, b) => b[key] - a[key] || a.played - b.played || a.id - b.id)[0];
      const asMeme = (row, key) => (row ? { image: toPublicImage(row), count: row[key], played: row.played } : null);

      return {
        gamesPlayed: totals.gamesPlayed,
        totalScore: totals.totalScore,
        bestScore: totals.bestScore,
        maxScore,
        averageScore: Math.round(totals.averageScore * 10) / 10,
        perfectGames: totals.perfectGames,
        lastPlayedAt: totals.lastPlayedAt,
        roundsPlayed: rounds.roundsPlayed,
        correctAnswers: rounds.correctAnswers,
        accuracy: rounds.roundsPlayed ? rounds.correctAnswers / rounds.roundsPlayed : 0,
        averageCorrectMs: rounds.averageCorrectMs === null ? null : Math.round(rounds.averageCorrectMs),
        fastestCorrectMs: rounds.fastestCorrectMs,
        longestStreak: longestStreak(statements.roundFlags.all(userId).map((r) => r.isCorrect === 1)),
        favoriteMeme: asMeme(best('correct'), 'correct'),
        nemesisMeme: asMeme(best('wrong'), 'wrong'),
        recentGames: statements.recent.all(userId, 20),
      };
    },

    /** Classifica per punti totali. Espone solo il nome visualizzato, mai username o id. */
    leaderboard({ limit, userId }) {
      const rows = statements.leaderboard.all();
      const shape = (row) => ({
        rank: row.rank,
        name: row.name,
        gamesPlayed: row.gamesPlayed,
        totalScore: row.totalScore,
        bestScore: row.bestScore,
        averageScore: row.averageScore,
        isCurrentUser: row.userId === userId,
      });
      const me = userId ? rows.find((row) => row.userId === userId) : undefined;
      return {
        players: rows.slice(0, limit).map(shape),
        currentUser: me ? shape(me) : null,
        totalPlayers: rows.length,
      };
    },
  };
}
