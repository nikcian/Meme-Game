import { hashPassword } from '../lib/passwords.mjs';
import { CAPTIONS, IMAGES, LEGACY_GAMES, MEMES } from './content.mjs';
import { transaction } from './transaction.mjs';

/** Account dimostrativi (documentati nel README): utili per provare subito storico e classifica. */
export const DEMO_USERS = Object.freeze([
  { id: 1, username: 'user', name: 'Mario', password: 'testpass' },
  { id: 2, username: 'prova', name: 'Giovanni', password: 'prova' },
]);

/**
 * Inserisce immagini, didascalie e abbinamenti se mancanti. Idempotente: può girare a ogni avvio.
 * @param {import('node:sqlite').DatabaseSync} db
 */
export function seedContent(db) {
  const insertImage = db.prepare(
    'INSERT OR IGNORE INTO images (id, fileName, title, alt, width, height) VALUES (?, ?, ?, ?, ?, ?)',
  );
  const insertCaption = db.prepare('INSERT OR IGNORE INTO captions (id, text) VALUES (?, ?)');
  const insertMeme = db.prepare('INSERT OR IGNORE INTO memes (imageId, captionId) VALUES (?, ?)');

  transaction(db, () => {
    for (const i of IMAGES) insertImage.run(i.id, i.fileName, i.title, i.alt, i.width, i.height);
    for (const c of CAPTIONS) insertCaption.run(c.id, c.text);
    for (const [imageId, captionIds] of Object.entries(MEMES)) {
      for (const captionId of captionIds) insertMeme.run(Number(imageId), captionId);
    }
  });
}

/** PRNG deterministico (mulberry32): i dati demo sono identici a ogni rigenerazione. */
function seededRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296;
  };
}

/**
 * Crea gli account demo e importa le partite di prova del progetto originale, solo se il
 * database non ha ancora utenti. Le partite originali non registravano la didascalia scelta
 * né il tempo di risposta: vengono ricostruiti in modo deterministico e coerente con l'esito.
 * @param {import('node:sqlite').DatabaseSync} db
 */
export async function seedDemoData(db) {
  if (db.prepare('SELECT COUNT(*) AS n FROM users').get().n > 0) return;

  const hashes = await Promise.all(DEMO_USERS.map((u) => hashPassword(u.password)));
  const random = seededRandom(322_359);
  const pick = (items) => items[Math.floor(random() * items.length)];
  const allCaptionIds = CAPTIONS.map((c) => c.id);

  const insertUser = db.prepare(
    "INSERT INTO users (id, username, name, passwordHash, createdAt) VALUES (?, ?, ?, ?, '2024-06-20T10:00:00.000Z')",
  );
  const insertGame = db.prepare('INSERT INTO games (userId, playedAt, score) VALUES (?, ?, ?)');
  const insertRound = db.prepare(
    'INSERT INTO rounds (gameId, position, imageId, captionId, isCorrect, timedOut, responseMs) VALUES (?, ?, ?, ?, ?, 0, ?)',
  );

  transaction(db, () => {
    DEMO_USERS.forEach((u, index) => insertUser.run(u.id, u.username, u.name, hashes[index]));

    LEGACY_GAMES.forEach((game, index) => {
      const playedAt = new Date(`${game.date}T16:00:00.000Z`);
      playedAt.setUTCMinutes(index * 7);
      const { lastInsertRowid: gameId } = insertGame.run(game.userId, playedAt.toISOString(), game.score);
      game.rounds.forEach(([imageId, isCorrect], position) => {
        const correct = MEMES[imageId];
        const captionId = isCorrect ? pick(correct) : pick(allCaptionIds.filter((id) => !correct.includes(id)));
        const responseMs = 3_000 + Math.floor(random() * 22_000);
        insertRound.run(gameId, position + 1, imageId, captionId, isCorrect ? 1 : 0, responseMs);
      });
    });
  });
}
