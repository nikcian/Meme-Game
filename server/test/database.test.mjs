import assert from 'node:assert/strict';
import { once } from 'node:events';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { after, describe, test } from 'node:test';
import { createApp } from '../src/app.mjs';
import { GAME_RULES } from '../src/config.mjs';
import { openDatabase } from '../src/db/database.mjs';
import { MIGRATIONS } from '../src/db/migrations.mjs';
import { createGameRepository } from '../src/repositories/games.mjs';
import { TestClient, testConfig } from './helpers.mjs';

const tempDir = mkdtempSync(path.join(tmpdir(), 'memegame-test-'));
after(() => rmSync(tempDir, { recursive: true, force: true }));

const count = (db, table) => db.prepare(`SELECT COUNT(*) AS n FROM ${table}`).get().n;

describe('Database', () => {
  test('migrazioni e seed sono idempotenti', async () => {
    const file = path.join(tempDir, 'idempotent.db');
    const first = await openDatabase(file);
    const snapshot = ['users', 'images', 'captions', 'memes', 'games', 'rounds'].map((t) => count(first, t));
    first.close();

    const second = await openDatabase(file);
    assert.equal(second.prepare('PRAGMA user_version').get().user_version, MIGRATIONS.at(-1).version);
    assert.deepEqual(['users', 'images', 'captions', 'memes', 'games', 'rounds'].map((t) => count(second, t)), snapshot);
    assert.deepEqual(snapshot.slice(1, 4), [10, 53, 53]);
    second.close();
  });

  test('il salvataggio di una partita è atomico: nessuna riga parziale in caso di errore', async () => {
    const db = await openDatabase(':memory:', { seedDemo: false });
    db.prepare("INSERT INTO users (username, name, passwordHash) VALUES ('atomic', 'Atomic', 'x')").run();
    const games = createGameRepository(db, GAME_RULES);
    const round = (position, imageId) => ({ position, imageId, captionId: null, isCorrect: false, timedOut: true, responseMs: 30_000 });

    // Il secondo round viola la foreign key (immagine inesistente): tutto deve essere annullato.
    assert.throws(() =>
      games.save({ userId: 1, playedAt: new Date().toISOString(), score: 0, rounds: [round(1, 1), round(2, 9_999)] }),
    );
    assert.equal(count(db, 'games'), 0);
    assert.equal(count(db, 'rounds'), 0);

    // Nessuna transazione rimasta aperta: il database è ancora utilizzabile.
    const id = games.save({ userId: 1, playedAt: new Date().toISOString(), score: 0, rounds: [round(1, 1), round(2, 2)] });
    assert.equal(count(db, 'games'), 1);
    assert.equal(games.findForUser(id, 1).rounds.length, 2);
    db.close();
  });

  test('le sessioni sopravvivono al riavvio del server', async () => {
    const file = path.join(tempDir, 'sessions.db');
    const start = async () => {
      const db = await openDatabase(file);
      const { app, close } = createApp({ config: testConfig(), db, logger: { info() {}, warn() {}, error() {} } });
      const server = app.listen(0, '127.0.0.1');
      await once(server, 'listening');
      return {
        base: `http://127.0.0.1:${server.address().port}`,
        async stop() {
          server.closeAllConnections();
          await new Promise((resolve) => server.close(resolve));
          close();
          db.close();
        },
      };
    };

    const first = await start();
    const client = new TestClient(first.base);
    assert.equal((await client.login()).status, 200);
    const cookie = `memegame.sid=${client.cookies.get('memegame.sid')}`;
    await first.stop();

    const second = await start();
    const session = await new TestClient(second.base).get('/api/session', { headers: { cookie } });
    assert.equal(session.data.user?.username, 'user');
    await second.stop();
  });
});
