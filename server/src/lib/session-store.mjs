import session from 'express-session';

/**
 * Store per express-session su SQLite: le sessioni sopravvivono ai riavvii e la memoria
 * non cresce senza limiti (a differenza del MemoryStore di default, sconsigliato in produzione).
 */
export class SqliteSessionStore extends session.Store {
  #statements;
  #timer;

  /**
   * @param {import('node:sqlite').DatabaseSync} db
   * @param {{ ttlMs: number, pruneIntervalMs?: number }} options
   */
  constructor(db, { ttlMs, pruneIntervalMs = 15 * 60_000 }) {
    super();
    this.ttlMs = ttlMs;
    this.#statements = {
      get: db.prepare('SELECT data, expiresAt FROM sessions WHERE sid = ?'),
      set: db.prepare(
        `INSERT INTO sessions (sid, data, expiresAt) VALUES (?, ?, ?)
         ON CONFLICT (sid) DO UPDATE SET data = excluded.data, expiresAt = excluded.expiresAt`,
      ),
      touch: db.prepare('UPDATE sessions SET expiresAt = ? WHERE sid = ?'),
      destroy: db.prepare('DELETE FROM sessions WHERE sid = ?'),
      prune: db.prepare('DELETE FROM sessions WHERE expiresAt <= ?'),
      clear: db.prepare('DELETE FROM sessions'),
      length: db.prepare('SELECT COUNT(*) AS n FROM sessions WHERE expiresAt > ?'),
    };
    this.#timer = setInterval(() => this.prune(), pruneIntervalMs);
    this.#timer.unref();
  }

  #expiresAt(sess) {
    const expires = sess?.cookie?.expires;
    const time = expires ? new Date(expires).getTime() : NaN;
    return Number.isFinite(time) ? time : Date.now() + this.ttlMs;
  }

  /** Esegue l'operazione e richiama la callback in modo asincrono, come il MemoryStore. */
  #run(callback, operation) {
    let result;
    let failure = null;
    try {
      result = operation();
    } catch (error) {
      failure = error;
    }
    if (callback) setImmediate(callback, failure, result);
  }

  get(sid, callback) {
    this.#run(callback, () => {
      const row = this.#statements.get.get(sid);
      if (!row) return null;
      if (row.expiresAt <= Date.now()) {
        this.#statements.destroy.run(sid);
        return null;
      }
      return JSON.parse(row.data);
    });
  }

  set(sid, sess, callback) {
    this.#run(callback, () => {
      this.#statements.set.run(sid, JSON.stringify(sess), this.#expiresAt(sess));
    });
  }

  touch(sid, sess, callback) {
    this.#run(callback, () => {
      this.#statements.touch.run(this.#expiresAt(sess), sid);
    });
  }

  destroy(sid, callback) {
    this.#run(callback, () => {
      this.#statements.destroy.run(sid);
    });
  }

  clear(callback) {
    this.#run(callback, () => {
      this.#statements.clear.run();
    });
  }

  length(callback) {
    this.#run(callback, () => this.#statements.length.get(Date.now()).n);
  }

  prune() {
    try {
      this.#statements.prune.run(Date.now());
    } catch {
      // Il database potrebbe essere già chiuso durante lo spegnimento: nulla da fare.
    }
  }

  close() {
    clearInterval(this.#timer);
  }
}
