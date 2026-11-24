import { tooManyRequests } from './errors.mjs';

/**
 * Rate limiter in memoria a finestra fissa. Sufficiente per un singolo processo;
 * con più istanze andrebbe sostituito da uno store condiviso (es. Redis).
 */
export class RateLimiter {
  #hits = new Map();
  #timer;

  /** @param {{ windowMs: number, max: number, maxKeys?: number, now?: () => number }} options */
  constructor({ windowMs, max, maxKeys = 50_000, now = Date.now }) {
    this.windowMs = windowMs;
    this.max = max;
    this.maxKeys = maxKeys;
    this.now = now;
    this.#timer = setInterval(() => this.prune(), Math.min(windowMs, 60_000));
    this.#timer.unref();
  }

  #entry(key) {
    const now = this.now();
    let entry = this.#hits.get(key);
    if (!entry || entry.resetAt <= now) {
      if (!entry && this.#hits.size >= this.maxKeys) this.prune();
      entry = { count: 0, resetAt: now + this.windowMs };
      this.#hits.set(key, entry);
    }
    return entry;
  }

  /** Secondi da attendere se la chiave è bloccata, altrimenti 0 (non consuma tentativi). */
  blockedFor(key) {
    const entry = this.#hits.get(key);
    if (!entry || entry.resetAt <= this.now() || entry.count < this.max) return 0;
    return Math.max(1, Math.ceil((entry.resetAt - this.now()) / 1000));
  }

  /** Registra un tentativo; restituisce i secondi di attesa se il limite è superato, altrimenti 0. */
  hit(key) {
    const entry = this.#entry(key);
    entry.count += 1;
    return entry.count > this.max ? Math.max(1, Math.ceil((entry.resetAt - this.now()) / 1000)) : 0;
  }

  reset(key) {
    this.#hits.delete(key);
  }

  prune() {
    const now = this.now();
    for (const [key, entry] of this.#hits) if (entry.resetAt <= now) this.#hits.delete(key);
    // Difesa contro l'esaurimento di memoria: se ancora troppe chiavi, scarta le più vecchie.
    for (const key of this.#hits.keys()) {
      if (this.#hits.size < this.maxKeys) break;
      this.#hits.delete(key);
    }
  }

  close() {
    clearInterval(this.#timer);
  }
}

/**
 * Middleware Express: limita le richieste per chiave (di default l'IP del client).
 * @param {RateLimiter} limiter
 * @param {{ message: string, key?: (req: import('express').Request) => string }} options
 */
export function rateLimit(limiter, { message, key = (req) => req.ip ?? 'unknown' }) {
  return (req, _res, next) => {
    const retryAfter = limiter.hit(key(req));
    if (retryAfter > 0) throw tooManyRequests(message, retryAfter);
    next();
  };
}
