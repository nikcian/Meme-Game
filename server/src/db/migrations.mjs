// Migrazioni dello schema, applicate in ordine e tracciate con `PRAGMA user_version`.
// Non modificare una migrazione già rilasciata: aggiungine una nuova in coda.

export const MIGRATIONS = [
  {
    version: 1,
    description: 'Schema iniziale',
    sql: `
      CREATE TABLE users (
        id            INTEGER PRIMARY KEY AUTOINCREMENT,
        username      TEXT    NOT NULL UNIQUE COLLATE NOCASE,
        name          TEXT    NOT NULL,
        passwordHash  TEXT    NOT NULL,
        createdAt     TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
      );

      CREATE TABLE images (
        id        INTEGER PRIMARY KEY AUTOINCREMENT,
        fileName  TEXT    NOT NULL UNIQUE,
        title     TEXT    NOT NULL,
        alt       TEXT    NOT NULL,
        width     INTEGER NOT NULL CHECK (width > 0),
        height    INTEGER NOT NULL CHECK (height > 0)
      );

      CREATE TABLE captions (
        id    INTEGER PRIMARY KEY AUTOINCREMENT,
        text  TEXT    NOT NULL UNIQUE
      );

      -- Coppie (immagine, didascalia) corrette.
      CREATE TABLE memes (
        imageId    INTEGER NOT NULL REFERENCES images (id) ON DELETE CASCADE,
        captionId  INTEGER NOT NULL REFERENCES captions (id) ON DELETE CASCADE,
        PRIMARY KEY (imageId, captionId)
      ) WITHOUT ROWID;
      CREATE INDEX memes_by_caption ON memes (captionId);

      -- Partite concluse dagli utenti registrati.
      CREATE TABLE games (
        id        INTEGER PRIMARY KEY AUTOINCREMENT,
        userId    INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
        playedAt  TEXT    NOT NULL,
        score     INTEGER NOT NULL CHECK (score >= 0)
      );
      CREATE INDEX games_by_user ON games (userId, playedAt DESC, id DESC);

      CREATE TABLE rounds (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        gameId      INTEGER NOT NULL REFERENCES games (id) ON DELETE CASCADE,
        position    INTEGER NOT NULL CHECK (position >= 1),
        imageId     INTEGER NOT NULL REFERENCES images (id),
        captionId   INTEGER REFERENCES captions (id),       -- NULL: nessuna risposta in tempo
        isCorrect   INTEGER NOT NULL CHECK (isCorrect IN (0, 1)),
        timedOut    INTEGER NOT NULL DEFAULT 0 CHECK (timedOut IN (0, 1)),
        responseMs  INTEGER CHECK (responseMs >= 0),
        UNIQUE (gameId, position)
      );
      CREATE INDEX rounds_by_image ON rounds (imageId);

      CREATE TABLE sessions (
        sid        TEXT    PRIMARY KEY,
        data       TEXT    NOT NULL,
        expiresAt  INTEGER NOT NULL
      ) WITHOUT ROWID;
      CREATE INDEX sessions_by_expiry ON sessions (expiresAt);
    `,
  },
];

/** @param {import('node:sqlite').DatabaseSync} db */
export function migrate(db) {
  const current = db.prepare('PRAGMA user_version').get().user_version;
  for (const migration of MIGRATIONS) {
    if (migration.version <= current) continue;
    db.exec('BEGIN IMMEDIATE');
    try {
      db.exec(migration.sql);
      db.exec(`PRAGMA user_version = ${Number(migration.version)}`);
      db.exec('COMMIT');
    } catch (error) {
      db.exec('ROLLBACK');
      throw new Error(`Migrazione ${migration.version} (${migration.description}) fallita: ${error.message}`, {
        cause: error,
      });
    }
  }
}
