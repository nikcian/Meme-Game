import assert from 'node:assert/strict';
import { after, before, describe, test } from 'node:test';
import { registeredClient, startTestServer } from './helpers.mjs';

describe('Partita', () => {
  let ctx;
  before(async () => {
    ctx = await startTestServer();
  });
  after(() => ctx.close());

  const correctIn = (game) => {
    const correct = ctx.correctCaptionIds(game.round.image.id);
    return game.round.captions.map((c) => c.id).filter((id) => correct.includes(id));
  };
  const wrongIn = (game) => {
    const correct = ctx.correctCaptionIds(game.round.image.id);
    return game.round.captions.map((c) => c.id).filter((id) => !correct.includes(id));
  };

  test('ospite: 1 round con 7 didascalie distinte, esattamente 2 corrette', async () => {
    const { status, data } = await ctx.client().post('/api/game');
    assert.equal(status, 201);
    const { game } = data;
    assert.equal(game.mode, 'guest');
    assert.equal(game.status, 'playing');
    assert.equal(game.totalRounds, 1);
    assert.equal(game.round.position, 1);
    assert.equal(game.round.captions.length, 7);
    assert.equal(new Set(game.round.captions.map((c) => c.id)).size, 7);
    assert.equal(correctIn(game).length, 2);
    assert.ok(game.round.remainingMs > 28_000 && game.round.remainingMs <= 30_000);
    assert.match(game.round.image.url, /^\/static\/.+\.jpg$/);
  });

  test('le soluzioni non vengono mai inviate prima della risposta', async () => {
    const client = ctx.client();
    const started = await client.post('/api/game');
    const fetched = await client.get('/api/game');
    for (const { game } of [started.data, fetched.data]) {
      assert.equal(game.round.result, null);
      assert.deepEqual(game.results, []);
      assert.equal(JSON.stringify(game).includes('correctCaptions'), false);
    }
  });

  test('risposta corretta da ospite: +5 punti, soluzioni rivelate, nessun salvataggio', async () => {
    const client = ctx.client();
    const { game } = (await client.post('/api/game')).data;
    const [chosen] = correctIn(game);
    const { status, data } = await client.post('/api/game/answer', { round: 1, captionId: chosen });
    assert.equal(status, 200);
    const result = data.game.round.result;
    assert.equal(result.isCorrect, true);
    assert.equal(result.points, 5);
    assert.equal(result.selectedCaption.id, chosen);
    assert.deepEqual(result.correctCaptions.map((c) => c.id).sort(), correctIn(game).sort());
    assert.equal(data.game.status, 'finished');
    assert.equal(data.game.score, 5);
    assert.equal(data.game.savedGameId, null);
  });

  test('risposta sbagliata: 0 punti, le due corrette vengono comunque mostrate', async () => {
    const client = ctx.client();
    const { game } = (await client.post('/api/game')).data;
    const { data } = await client.post('/api/game/answer', { round: 1, captionId: wrongIn(game)[0] });
    assert.equal(data.game.round.result.isCorrect, false);
    assert.equal(data.game.round.result.points, 0);
    assert.equal(data.game.round.result.correctCaptions.length, 2);
  });

  test('utente registrato: 3 round con immagini diverse, salvati nello storico', async () => {
    const { client } = await registeredClient(ctx);
    let { game } = (await client.post('/api/game')).data;
    assert.equal(game.mode, 'full');
    assert.equal(game.totalRounds, 3);
    const images = [];
    const choices = [];

    for (let position = 1; position <= 3; position += 1) {
      images.push(game.round.image.id);
      const pickCorrect = position !== 2;
      const captionId = pickCorrect ? correctIn(game)[0] : wrongIn(game)[0];
      choices.push(captionId);
      game = (await client.post('/api/game/answer', { round: position, captionId })).data.game;
      if (position < 3) {
        assert.equal(game.status, 'playing');
        assert.equal(game.upcomingImage.id !== game.round.image.id, true);
        game = (await client.post('/api/game/next', { round: position + 1 })).data.game;
        assert.equal(game.round.position, position + 1);
        assert.equal(game.upcomingImage, null);
      }
    }

    assert.equal(new Set(images).size, 3);
    assert.equal(game.status, 'finished');
    assert.equal(game.score, 10);
    assert.equal(game.results.length, 3);
    assert.ok(Number.isInteger(game.savedGameId));

    const saved = await client.get(`/api/history/${game.savedGameId}`);
    assert.equal(saved.status, 200);
    assert.equal(saved.data.game.score, 10);
    assert.deepEqual(saved.data.game.rounds.map((r) => r.image.id), images);
    assert.deepEqual(saved.data.game.rounds.map((r) => r.caption.id), choices);
    assert.deepEqual(saved.data.game.rounds.map((r) => r.isCorrect), [true, false, true]);
  });

  test('rifiuta didascalie fuori dal mazzo, round errati e risposte doppie', async () => {
    const client = ctx.client();
    const { game } = (await client.post('/api/game')).data;
    const dealt = new Set(game.round.captions.map((c) => c.id));
    const foreign = Array.from({ length: 53 }, (_, i) => i + 1).find((id) => !dealt.has(id));

    assert.equal((await client.post('/api/game/answer', { round: 1, captionId: foreign })).status, 400);
    assert.equal((await client.post('/api/game/answer', { round: 2, captionId: [...dealt][0] })).status, 409);
    assert.equal((await client.post('/api/game/answer', { round: 1, captionId: '5' })).status, 400);
    assert.equal((await client.post('/api/game/answer', { captionId: [...dealt][0] })).status, 400);

    assert.equal((await client.post('/api/game/answer', { round: 1, captionId: [...dealt][0] })).status, 200);
    assert.equal((await client.post('/api/game/answer', { round: 1, captionId: [...dealt][1] })).status, 409);
  });

  test('risposte concorrenti: ne viene accettata una sola', async () => {
    const client = ctx.client();
    const { game } = (await client.post('/api/game')).data;
    const ids = game.round.captions.map((c) => c.id);
    const responses = await Promise.all(ids.map((captionId) => client.post('/api/game/answer', { round: 1, captionId })));
    assert.equal(responses.filter((r) => r.status === 200).length, 1);
    assert.equal(responses.filter((r) => r.status === 409).length, ids.length - 1);
  });

  test('next è idempotente e richiede prima una risposta', async () => {
    const { client } = await registeredClient(ctx);
    const { game } = (await client.post('/api/game')).data;
    assert.equal((await client.post('/api/game/next', { round: 2 })).status, 409);
    await client.post('/api/game/answer', { round: 1, captionId: game.round.captions[0].id });
    const first = await client.post('/api/game/next', { round: 2 });
    const doubleClick = await client.post('/api/game/next', { round: 2 });
    assert.equal(first.status, 200);
    assert.equal(doubleClick.status, 200);
    assert.equal(doubleClick.data.game.round.position, 2);
    assert.deepEqual(doubleClick.data.game.round.captions, first.data.game.round.captions);
    assert.equal((await client.post('/api/game/next', { round: 4 })).status, 409);
  });

  test('una risposta oltre il tempo limite conta come tempo scaduto', async () => {
    const client = ctx.client();
    const { game } = (await client.post('/api/game')).data;
    ctx.clock.advance(31_000); // entro la tolleranza di rete: ancora valida
    const [chosen] = correctIn(game);
    const inTime = await client.post('/api/game/answer', { round: 1, captionId: chosen });
    assert.equal(inTime.data.game.round.result.isCorrect, true);

    const late = ctx.client();
    const lateGame = (await late.post('/api/game')).data.game;
    ctx.clock.advance(33_000);
    const { status, data } = await late.post('/api/game/answer', { round: 1, captionId: correctIn(lateGame)[0] });
    // Anche se la didascalia era giusta, oltre il limite vale come tempo scaduto.
    assert.equal(status, 200);
    const { result } = data.game.round;
    assert.equal(result.timedOut, true);
    assert.equal(result.isCorrect, false);
    assert.equal(result.selectedCaption, null);
    assert.equal(result.responseMs, 30_000);
  });

  test('un round scaduto viene chiuso alla riapertura della partita', async () => {
    const client = ctx.client();
    await client.post('/api/game');
    ctx.clock.advance(40_000);
    const { game } = (await client.get('/api/game')).data;
    assert.equal(game.round.result.timedOut, true);
    assert.equal(game.status, 'finished');
    assert.ok(game.round.result.correctCaptions.length === 2);
  });

  test('timeout esplicito del client (captionId null)', async () => {
    const client = ctx.client();
    await client.post('/api/game');
    const { data } = await client.post('/api/game/answer', { round: 1, captionId: null });
    assert.equal(data.game.round.result.timedOut, true);
    assert.equal(data.game.score, 0);
  });

  test("dopo un refresh la partita riprende con il tempo residuo calcolato dal server", async () => {
    const client = ctx.client();
    await client.post('/api/game');
    ctx.clock.advance(10_000);
    const { game } = (await client.get('/api/game')).data;
    assert.ok(game.round.remainingMs <= 20_000 && game.round.remainingMs > 18_000);
  });

  test('una partita è accessibile solo dalla sessione che l’ha creata', async () => {
    const owner = ctx.client();
    await owner.post('/api/game');
    const stranger = ctx.client();
    assert.equal((await stranger.get('/api/game')).data.game, null);
    assert.equal((await stranger.post('/api/game/answer', { round: 1, captionId: 1 })).status, 404);
  });

  test('abbandono: la partita non esiste più', async () => {
    const client = ctx.client();
    await client.post('/api/game');
    assert.equal((await client.delete('/api/game')).status, 204);
    assert.equal((await client.get('/api/game')).data.game, null);
  });

  test('limita la creazione di partite a raffica', async () => {
    const client = ctx.client();
    const statuses = [];
    for (let i = 0; i < 25; i += 1) statuses.push((await client.post('/api/game')).status);
    assert.ok(statuses.includes(429));
  });
});
