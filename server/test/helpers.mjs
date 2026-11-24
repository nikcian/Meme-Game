import { once } from 'node:events';
import path from 'node:path';
import { createApp } from '../src/app.mjs';
import { GAME_RULES, SERVER_ROOT } from '../src/config.mjs';
import { openDatabase } from '../src/db/database.mjs';

const silentLogger = { info() {}, warn() {}, error() {} };

export function testConfig(overrides = {}) {
  return {
    env: 'test',
    isProduction: false,
    host: '127.0.0.1',
    port: 0,
    sessionSecret: 'test-secret-'.padEnd(48, 'x'),
    sessionMaxAgeMs: 60 * 60_000,
    secureCookies: false,
    trustProxy: false,
    allowedOrigins: [],
    seedDemoData: true,
    logRequests: false,
    memesDir: path.join(SERVER_ROOT, 'public'),
    clientDistDir: path.join(SERVER_ROOT, 'does-not-exist'),
    serveClient: false,
    game: GAME_RULES,
    ...overrides,
  };
}

/** Client HTTP con cookie jar, per simulare un browser nei test. */
export class TestClient {
  #cookies = new Map();

  constructor(base) {
    this.base = base;
  }

  get cookies() {
    return new Map(this.#cookies);
  }

  async request(method, url, { body, headers = {} } = {}) {
    const response = await fetch(this.base + url, {
      method,
      redirect: 'manual',
      headers: {
        ...(body !== undefined && { 'content-type': 'application/json' }),
        ...(this.#cookies.size > 0 && {
          cookie: [...this.#cookies].map(([name, value]) => `${name}=${value}`).join('; '),
        }),
        ...headers,
      },
      body: body === undefined ? undefined : typeof body === 'string' ? body : JSON.stringify(body),
    });
    const setCookies = response.headers.getSetCookie();
    for (const cookie of setCookies) {
      const [pair] = cookie.split(';');
      const index = pair.indexOf('=');
      const name = pair.slice(0, index);
      const value = pair.slice(index + 1);
      if (value === '' || /expires=Thu, 01 Jan 1970/i.test(cookie)) this.#cookies.delete(name);
      else this.#cookies.set(name, value);
    }
    const text = await response.text();
    let data = text;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      // risposta non JSON
    }
    return { status: response.status, headers: response.headers, data, setCookies };
  }

  get(url, options) {
    return this.request('GET', url, options);
  }

  post(url, body, options) {
    return this.request('POST', url, { ...options, body });
  }

  delete(url, options) {
    return this.request('DELETE', url, options);
  }

  login(username = 'user', password = 'testpass') {
    return this.post('/api/session', { username, password });
  }
}

/**
 * Avvia l'app su una porta libera con database in memoria e un orologio spostabile in avanti
 * (`clock.advance(ms)`) per testare i timeout senza attese reali.
 */
export async function startTestServer({ config: overrides } = {}) {
  const clock = {
    offset: 0,
    now() {
      return Date.now() + this.offset;
    },
    advance(ms) {
      this.offset += ms;
    },
  };
  const db = await openDatabase(':memory:', { seedDemo: true });
  const { app, close, gameService } = createApp({ config: testConfig(overrides), db, clock, logger: silentLogger });
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const base = `http://127.0.0.1:${server.address().port}`;

  return {
    base,
    db,
    clock,
    gameService,
    client: () => new TestClient(base),
    /** Didascalie corrette di un'immagine, lette direttamente dal database. */
    correctCaptionIds: (imageId) =>
      db.prepare('SELECT captionId FROM memes WHERE imageId = ?').all(imageId).map((r) => r.captionId),
    async close() {
      server.closeAllConnections();
      await new Promise((resolve) => server.close(resolve));
      close();
      db.close();
    },
  };
}

let counter = 0;
/** Registra un nuovo utente con dati unici e restituisce il client già autenticato. */
export async function registeredClient(ctx, name = 'Tester') {
  counter += 1;
  const client = ctx.client();
  const response = await client.post('/api/users', {
    username: `tester_${process.pid}_${counter}`,
    name,
    password: 'password-sicura',
  });
  if (response.status !== 201) throw new Error(`Registrazione fallita: ${JSON.stringify(response.data)}`);
  return { client, user: response.data.user };
}
