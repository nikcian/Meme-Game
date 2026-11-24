import { conflict } from '../lib/errors.mjs';

const SQLITE_CONSTRAINT_UNIQUE = 2067;

/** @param {{ id: number, username: string, name: string }} row */
export const toPublicUser = (row) => ({ id: row.id, username: row.username, name: row.name });

/** @param {import('node:sqlite').DatabaseSync} db */
export function createUserRepository(db) {
  const byUsername = db.prepare('SELECT id, username, name, passwordHash FROM users WHERE username = ?');
  const byId = db.prepare('SELECT id, username, name FROM users WHERE id = ?');
  const insert = db.prepare('INSERT INTO users (username, name, passwordHash) VALUES (?, ?, ?)');
  const updateHash = db.prepare('UPDATE users SET passwordHash = ? WHERE id = ?');

  return {
    /** Ricerca case-insensitive (colonna COLLATE NOCASE). Include l'hash: non esporlo mai. */
    findCredentials: (username) => byUsername.get(username) ?? null,

    findById: (id) => byId.get(id) ?? null,

    /** @returns {number} id del nuovo utente */
    create({ username, name, passwordHash }) {
      try {
        return Number(insert.run(username, name, passwordHash).lastInsertRowid);
      } catch (error) {
        if (error?.errcode === SQLITE_CONSTRAINT_UNIQUE) {
          throw conflict('Questo username è già in uso.', { username: 'Questo username è già in uso.' });
        }
        throw error;
      }
    },

    updatePasswordHash: (id, passwordHash) => updateHash.run(passwordHash, id),
  };
}
