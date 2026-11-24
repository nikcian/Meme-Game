import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';

// Hash delle password con scrypt (memory-hard) e parametri OWASP: N=2^14, r=8, p=5.
// Formato salvato: scrypt$N$r$p$salt$hash (base64url), così i parametri possono evolvere
// e gli hash vecchi vengono aggiornati in modo trasparente al primo login riuscito.

const CURRENT = Object.freeze({ N: 16_384, r: 8, p: 5, keyLength: 32, saltLength: 16 });
const MAX_MEM = 64 * 1024 * 1024;

function scrypt(password, salt, keyLength, { N, r, p }) {
  return new Promise((resolve, reject) => {
    scryptCallback(password.normalize('NFKC'), salt, keyLength, { N, r, p, maxmem: MAX_MEM }, (error, key) =>
      error ? reject(error) : resolve(key),
    );
  });
}

/** @param {string} password */
export async function hashPassword(password) {
  const salt = randomBytes(CURRENT.saltLength);
  const key = await scrypt(password, salt, CURRENT.keyLength, CURRENT);
  return ['scrypt', CURRENT.N, CURRENT.r, CURRENT.p, salt.toString('base64url'), key.toString('base64url')].join('$');
}

function parse(stored) {
  const parts = typeof stored === 'string' ? stored.split('$') : [];
  if (parts.length !== 6 || parts[0] !== 'scrypt') return null;
  const [N, r, p] = parts.slice(1, 4).map(Number);
  const salt = Buffer.from(parts[4], 'base64url');
  const key = Buffer.from(parts[5], 'base64url');
  if (![N, r, p].every(Number.isSafeInteger) || salt.length === 0 || key.length === 0) return null;
  return { N, r, p, salt, key };
}

/**
 * Confronto a tempo costante. Restituisce false (senza lanciare) per hash malformati.
 * @param {string} password
 * @param {string} stored
 */
export async function verifyPassword(password, stored) {
  const parsed = parse(stored);
  if (!parsed) return false;
  const candidate = await scrypt(password, parsed.salt, parsed.key.length, parsed);
  return timingSafeEqual(candidate, parsed.key);
}

/** True se l'hash è stato creato con parametri diversi da quelli attuali. */
export function needsRehash(stored) {
  const parsed = parse(stored);
  return !parsed || parsed.N !== CURRENT.N || parsed.r !== CURRENT.r || parsed.p !== CURRENT.p;
}

let dummyHash;
/**
 * Esegue comunque un confronto quando l'utente non esiste, così il tempo di risposta
 * non rivela quali username sono registrati.
 */
export async function verifyAgainstDummy(password) {
  dummyHash ??= hashPassword(randomBytes(16).toString('hex'));
  await verifyPassword(password, await dummyHash);
  return false;
}
