import assert from 'node:assert/strict';
import { after, before, describe, test } from 'node:test';
import { hashPassword, needsRehash, verifyPassword } from '../src/lib/passwords.mjs';
import { startTestServer } from './helpers.mjs';

describe('Sicurezza HTTP', () => {
  let ctx;
  before(async () => {
    ctx = await startTestServer();
  });
  after(() => ctx.close());

  test('imposta header di sicurezza e una CSP restrittiva', async () => {
    const { headers } = await ctx.client().get('/api/health');
    const csp = headers.get('content-security-policy');
    assert.match(csp, /default-src 'self'/);
    assert.match(csp, /script-src 'self'(;|$)/);
    assert.match(csp, /frame-ancestors 'none'/);
    assert.match(csp, /object-src 'none'/);
    assert.equal(headers.get('x-content-type-options'), 'nosniff');
    assert.equal(headers.get('x-frame-options'), 'DENY');
    assert.equal(headers.get('referrer-policy'), 'strict-origin-when-cross-origin');
    assert.ok(headers.get('permissions-policy').includes('camera=()'));
    assert.equal(headers.get('x-powered-by'), null);
  });

  test('non espone header CORS: le API sono same-origin', async () => {
    const { headers } = await ctx.client().get('/api/health', { headers: { origin: 'https://evil.example' } });
    assert.equal(headers.get('access-control-allow-origin'), null);
  });

  test('blocca le richieste cross-site che modificano dati (CSRF)', async () => {
    const client = ctx.client();
    const credentials = { username: 'user', password: 'testpass' };
    const crossSite = await client.post('/api/session', credentials, { headers: { 'sec-fetch-site': 'cross-site' } });
    assert.equal(crossSite.status, 403);
    const foreignOrigin = await client.post('/api/session', credentials, { headers: { origin: 'https://evil.example' } });
    assert.equal(foreignOrigin.status, 403);
    const nullOrigin = await client.post('/api/game', undefined, { headers: { origin: 'null' } });
    assert.equal(nullOrigin.status, 403);
    const sameOrigin = await client.post('/api/session', credentials, {
      headers: { origin: ctx.base, 'sec-fetch-site': 'same-origin' },
    });
    assert.equal(sameOrigin.status, 200);
  });

  test('cookie di sessione HttpOnly e SameSite=Strict, senza nome di default', async () => {
    const { setCookies } = await ctx.client().login();
    assert.equal(setCookies.length, 1);
    const [cookie] = setCookies;
    assert.match(cookie, /^memegame\.sid=/);
    assert.match(cookie, /HttpOnly/);
    assert.match(cookie, /SameSite=Strict/);
    assert.match(cookie, /Path=\//);
  });

  test('risponde con 404 JSON agli endpoint sconosciuti', async () => {
    const { status, data } = await ctx.client().get('/api/images/pick');
    assert.equal(status, 404);
    assert.equal(typeof data.error, 'string');
  });

  test('rifiuta JSON malformato e body troppo grandi senza esporre dettagli interni', async () => {
    const client = ctx.client();
    const malformed = await client.post('/api/session', '{"username":');
    assert.equal(malformed.status, 400);
    assert.equal(malformed.data.error, 'Il corpo della richiesta non è un JSON valido.');
    const huge = await client.post('/api/session', { username: 'user', password: 'x'.repeat(20_000) });
    assert.equal(huge.status, 413);
    const notAnObject = await client.post('/api/session', [1, 2, 3]);
    assert.equal(notAnObject.status, 400);
  });

  test('le immagini sono servite con cache e nessun path traversal', async () => {
    const client = ctx.client();
    const image = await client.get('/static/This-Is-Fine.jpg');
    assert.equal(image.status, 200);
    assert.match(image.headers.get('cache-control'), /max-age=604800/);
    const traversal = await client.get('/static/..%2Fsrc%2Fconfig.mjs');
    assert.notEqual(traversal.status, 200);
    const dotfile = await client.get('/static/%2E%2E/package.json');
    assert.notEqual(dotfile.status, 200);
  });
});

describe('Hash delle password', () => {
  test('hash e verifica, con salt casuale', async () => {
    const first = await hashPassword('correct horse battery staple');
    const second = await hashPassword('correct horse battery staple');
    assert.notEqual(first, second);
    assert.match(first, /^scrypt\$16384\$8\$5\$/);
    assert.equal(await verifyPassword('correct horse battery staple', first), true);
    assert.equal(await verifyPassword('Correct horse battery staple', first), false);
  });

  test('gli hash malformati non vengono accettati e vanno rigenerati', async () => {
    assert.equal(await verifyPassword('qualsiasi', 'non-un-hash'), false);
    assert.equal(await verifyPassword('qualsiasi', ''), false);
    assert.equal(needsRehash('scrypt$1024$8$1$c2FsdA$aGFzaA'), true);
    assert.equal(needsRehash(await hashPassword('x')), false);
  });
});
