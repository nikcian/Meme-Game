import assert from 'node:assert/strict';
import { after, before, describe, test } from 'node:test';
import { startTestServer } from './helpers.mjs';

describe('Autenticazione', () => {
  let ctx;
  before(async () => {
    ctx = await startTestServer();
  });
  after(() => ctx.close());

  test('senza login la sessione è vuota (200, user null) e non crea cookie', async () => {
    const { status, data, setCookies } = await ctx.client().get('/api/session');
    assert.equal(status, 200);
    assert.deepEqual(data, { user: null });
    assert.equal(setCookies.length, 0);
  });

  test('credenziali errate: 401 con messaggio generico e nessun cookie', async () => {
    const wrongPassword = await ctx.client().login('user', 'sbagliata');
    const unknownUser = await ctx.client().login('nessuno', 'sbagliata');
    for (const response of [wrongPassword, unknownUser]) {
      assert.equal(response.status, 401);
      assert.equal(response.data.error, 'Username o password non corretti.');
      assert.equal(response.setCookies.length, 0);
    }
  });

  test('login corretto: restituisce solo i dati pubblici e mantiene la sessione', async () => {
    const client = ctx.client();
    const { status, data } = await client.login('USER', 'testpass');
    assert.equal(status, 200);
    assert.deepEqual(data.user, { id: 1, username: 'user', name: 'Mario' });
    const session = await client.get('/api/session');
    assert.deepEqual(session.data.user, data.user);
  });

  test("rigenera l'id di sessione al login (niente session fixation)", async () => {
    const client = ctx.client();
    await client.post('/api/game');
    const before = client.cookies.get('memegame.sid');
    assert.ok(before, 'la partita da ospite crea una sessione');
    await client.login();
    const afterLogin = client.cookies.get('memegame.sid');
    assert.ok(afterLogin);
    assert.notEqual(afterLogin, before);
    // La vecchia sessione non è più valida.
    const stale = await ctx.client().get('/api/game', { headers: { cookie: `memegame.sid=${before}` } });
    assert.equal(stale.data.game, null);
  });

  test('logout: la sessione viene distrutta e il cookie cancellato', async () => {
    const client = ctx.client();
    await client.login();
    const sid = client.cookies.get('memegame.sid');
    const logout = await client.delete('/api/session');
    assert.equal(logout.status, 204);
    assert.equal(client.cookies.has('memegame.sid'), false);
    const reuse = await ctx.client().get('/api/session', { headers: { cookie: `memegame.sid=${sid}` } });
    assert.equal(reuse.data.user, null);
  });

  test('blocca il brute force: dopo 5 errori risponde 429 con Retry-After, anche con la password giusta', async () => {
    const client = ctx.client();
    for (let i = 0; i < 5; i += 1) {
      assert.equal((await client.login('prova', `tentativo-${i}`)).status, 401);
    }
    const blocked = await client.login('prova', 'prova');
    assert.equal(blocked.status, 429);
    assert.ok(Number(blocked.headers.get('retry-after')) > 0);
  });

  test('registrazione: validazione dei campi', async () => {
    const { status, data } = await ctx.client().post('/api/users', { username: 'a b', name: '', password: 'corta' });
    assert.equal(status, 400);
    assert.deepEqual(Object.keys(data.details).sort(), ['name', 'password', 'username']);
  });

  test('registrazione: crea l’account, effettua il login e rifiuta duplicati case-insensitive', async () => {
    const client = ctx.client();
    const created = await client.post('/api/users', { username: 'Nuovo.Utente', name: '  Anna  ', password: 'password123' });
    assert.equal(created.status, 201);
    assert.equal(created.data.user.name, 'Anna');
    assert.equal(created.data.user.username, 'Nuovo.Utente');
    assert.equal((await client.get('/api/session')).data.user.username, 'Nuovo.Utente');

    const duplicate = await ctx.client().post('/api/users', { username: 'nuovo.utente', name: 'Altro', password: 'password123' });
    assert.equal(duplicate.status, 409);
    assert.ok(duplicate.data.details.username);

    const login = await ctx.client().login('nuovo.utente', 'password123');
    assert.equal(login.status, 200);
  });
});
