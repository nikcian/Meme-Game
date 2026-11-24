import { randomBytes } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/** Cartella `server/`, indipendente dalla directory da cui viene avviato il processo. */
export const SERVER_ROOT = fileURLToPath(new URL('../', import.meta.url));

/** Regole di gioco: un solo punto in cui modificarle. */
export const GAME_RULES = Object.freeze({
  roundsPerGame: 3,
  roundsPerGuestGame: 1,
  captionsPerRound: 7,
  correctCaptionsPerRound: 2,
  pointsPerCorrectAnswer: 5,
  roundDurationMs: 30_000,
  /** Tolleranza per la latenza di rete prima di considerare una risposta fuori tempo. */
  answerGraceMs: 2_000,
  /** Le partite inattive vengono rimosse dalla memoria dopo questo intervallo. */
  idleGameTtlMs: 30 * 60_000,
  maxActiveGames: 10_000,
});

const MIN_SECRET_LENGTH = 32;

function readInt(name, fallback) {
  const raw = process.env[name];
  if (raw === undefined || raw === '') return fallback;
  const value = Number(raw);
  if (!Number.isInteger(value) || value < 0) throw new Error(`${name} deve essere un intero non negativo.`);
  return value;
}

function readBool(name, fallback) {
  const raw = process.env[name]?.trim().toLowerCase();
  if (raw === undefined || raw === '') return fallback;
  if (['1', 'true', 'yes', 'on'].includes(raw)) return true;
  if (['0', 'false', 'no', 'off'].includes(raw)) return false;
  throw new Error(`${name} deve essere true o false.`);
}

/** `TRUST_PROXY` accetta un numero di hop, true/false o una lista di indirizzi (vedi Express "trust proxy"). */
function readTrustProxy() {
  const raw = process.env.TRUST_PROXY?.trim();
  if (!raw || raw === 'false') return false;
  if (raw === 'true') return true;
  return /^\d+$/.test(raw) ? Number(raw) : raw;
}

function resolveSessionSecret({ isProduction, dataDir }) {
  const fromEnv = process.env.SESSION_SECRET?.trim();
  if (fromEnv) {
    if (fromEnv.length < MIN_SECRET_LENGTH) {
      throw new Error(`SESSION_SECRET deve contenere almeno ${MIN_SECRET_LENGTH} caratteri.`);
    }
    return fromEnv;
  }
  if (isProduction) {
    throw new Error(
      'SESSION_SECRET è obbligatoria in produzione. Generane una con: ' +
        `node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"`,
    );
  }
  // In sviluppo il segreto viene generato una volta e salvato nella cartella dati (ignorata da git),
  // così le sessioni sopravvivono ai riavvii di `node --watch`.
  const file = path.join(dataDir, '.session-secret');
  if (existsSync(file)) {
    const stored = readFileSync(file, 'utf8').trim();
    if (stored.length >= MIN_SECRET_LENGTH) return stored;
  }
  mkdirSync(dataDir, { recursive: true });
  const secret = randomBytes(48).toString('base64url');
  writeFileSync(file, secret, { mode: 0o600 });
  return secret;
}

/**
 * Legge la configurazione dalle variabili d'ambiente (vedi `.env.example`).
 * `--production` sulla riga di comando equivale a `NODE_ENV=production` e funziona su ogni sistema operativo.
 */
export function loadConfig() {
  if (process.argv.includes('--production')) process.env.NODE_ENV = 'production';
  const env = process.env.NODE_ENV || 'development';
  const isProduction = env === 'production';
  const dataDir = path.resolve(SERVER_ROOT, process.env.DATA_DIR || 'data');

  return Object.freeze({
    env,
    isProduction,
    host: process.env.HOST || (isProduction ? '0.0.0.0' : 'localhost'),
    port: readInt('PORT', 3001),
    dataDir,
    dbPath: path.resolve(dataDir, process.env.DB_FILE || 'meme-game.db'),
    sessionSecret: resolveSessionSecret({ isProduction, dataDir }),
    sessionMaxAgeMs: 7 * 24 * 60 * 60_000,
    /** Cookie `Secure` e HSTS: da attivare quando l'app è servita in HTTPS. */
    secureCookies: readBool('SECURE_COOKIES', isProduction),
    trustProxy: readTrustProxy(),
    /** Origini aggiuntive ammesse per le richieste che modificano dati (oltre a quella del server). */
    allowedOrigins: (process.env.ALLOWED_ORIGINS || '').split(',').map((s) => s.trim()).filter(Boolean),
    seedDemoData: readBool('SEED_DEMO_DATA', true),
    logRequests: readBool('LOG_REQUESTS', !isProduction),
    memesDir: path.resolve(SERVER_ROOT, 'public'),
    clientDistDir: path.resolve(SERVER_ROOT, '../client/dist'),
    serveClient: readBool('SERVE_CLIENT', isProduction),
    game: GAME_RULES,
  });
}
