import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { migrate } from './migrations.mjs';
import { seedContent, seedDemoData } from './seed.mjs';

/**
 * Apre (creandolo se serve) il database SQLite con il modulo nativo `node:sqlite`:
 * nessuna dipendenza nativa da compilare, API sincrona e transazioni semplici.
 *
 * @param {string} file percorso del file oppure ':memory:'
 * @param {{ seedDemo?: boolean }} [options]
 */
export async function openDatabase(file, { seedDemo = true } = {}) {
  if (file !== ':memory:') mkdirSync(path.dirname(file), { recursive: true });

  const db = new DatabaseSync(file, { enableForeignKeyConstraints: true });
  db.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA synchronous = NORMAL;
    PRAGMA busy_timeout = 5000;
    PRAGMA foreign_keys = ON;
  `);

  migrate(db);
  seedContent(db);
  if (seedDemo) await seedDemoData(db);
  return db;
}
