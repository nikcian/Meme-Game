// Ricrea il database da zero (schema + contenuti + dati demo). Ferma il server prima di usarlo.
import { rmSync } from 'node:fs';
import { loadConfig } from '../config.mjs';
import { openDatabase } from './database.mjs';

const config = loadConfig();
for (const suffix of ['', '-wal', '-shm']) rmSync(`${config.dbPath}${suffix}`, { force: true });

const db = await openDatabase(config.dbPath, { seedDemo: config.seedDemoData });
const count = (table) => db.prepare(`SELECT COUNT(*) AS n FROM ${table}`).get().n;
console.info(
  `✔ Database ricreato in ${config.dbPath}\n` +
    `  ${count('images')} immagini · ${count('captions')} didascalie · ${count('users')} utenti · ${count('games')} partite`,
);
db.close();
