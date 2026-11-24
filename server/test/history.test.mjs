import assert from 'node:assert/strict';
import { after, before, describe, test } from 'node:test';
import { registeredClient, startTestServer } from './helpers.mjs';

describe('Storico, statistiche e classifica', () => {
  let ctx;
  before(async () => {
    ctx = await startTestServer();
  });
  after(() => ctx.close());

  /** Gioca una partita completa rispondendo bene ai round indicati. */
  async function playGame(client, correctRounds) {
    let { game } = (await client.post('/api/game')).data;
    for (let position = 1; position <= game.totalRounds; position += 1) {
      const correct = ctx.correctCaptionIds(game.round.image.id);
      const ids = game.round.captions.map((c) => c.id);
      const captionId = correctRounds.includes(position)
        ? ids.find((id) => correct.includes(id))
        : ids.find((id) => !correct.includes(id));
      game = (await client.post('/api/game/answer', { round: position, captionId })).data.game;
      if (position < game.totalRounds) game = (await client.post('/api/game/next', { round: position + 1 })).data.game;
    }
    return game;
  }

  test('storico, statistiche e dettaglio richiedono il login', async () => {
    const client = ctx.client();
    for (const url of ['/api/history', '/api/history/stats', '/api/history/1']) {
      assert.equal((await client.get(url)).status, 401);
    }
  });

  test('storico vuoto e statistiche a zero per un nuovo utente', async () => {
    const { client } = await registeredClient(ctx);
    const history = (await client.get('/api/history')).data;
    assert.deepEqual(history, { items: [], total: 0, limit: 10, offset: 0 });
    const { stats } = (await client.get('/api/history/stats')).data;
    assert.equal(stats.gamesPlayed, 0);
    assert.equal(stats.accuracy, 0);
    assert.equal(stats.favoriteMeme, null);
    assert.deepEqual(stats.recentGames, []);
  });

  test('storico paginato dal più recente, con round, didascalie e punti', async () => {
    const { client } = await registeredClient(ctx);
    await playGame(client, [1, 2, 3]);
    ctx.clock.advance(1_000);
    await playGame(client, []);
    ctx.clock.advance(1_000);
    await playGame(client, [3]);

    const page = (await client.get('/api/history?limit=2')).data;
    assert.equal(page.total, 3);
    assert.equal(page.items.length, 2);
    assert.deepEqual(page.items.map((g) => g.score), [5, 0]);
    const [latest] = page.items;
    assert.equal(latest.maxScore, 15);
    assert.equal(latest.rounds.length, 3);
    assert.deepEqual(latest.rounds.map((r) => r.points), [0, 0, 5]);
    assert.ok(latest.rounds.every((r) => r.caption && typeof r.caption.text === 'string'));
    assert.ok(latest.rounds.every((r) => typeof r.responseMs === 'number'));

    const next = (await client.get('/api/history?limit=2&offset=2')).data;
    assert.deepEqual(next.items.map((g) => g.score), [15]);

    const { stats } = (await client.get('/api/history/stats')).data;
    assert.equal(stats.gamesPlayed, 3);
    assert.equal(stats.totalScore, 20);
    assert.equal(stats.bestScore, 15);
    assert.equal(stats.perfectGames, 1);
    assert.equal(stats.correctAnswers, 4);
    assert.equal(stats.roundsPlayed, 9);
    assert.equal(stats.longestStreak, 3);
    assert.deepEqual(stats.recentGames.map((g) => g.score), [15, 0, 5]);
    assert.ok(stats.favoriteMeme.image.url.startsWith('/static/'));
  });

  test('IDOR: nessuno può leggere le partite di un altro utente', async () => {
    const alice = await registeredClient(ctx, 'Alice');
    const game = await playGame(alice.client, [1]);
    const bob = await registeredClient(ctx, 'Bob');
    const attempt = await bob.client.get(`/api/history/${game.savedGameId}`);
    assert.equal(attempt.status, 404);
    assert.equal((await alice.client.get(`/api/history/${game.savedGameId}`)).status, 200);
  });

  test('id malformati restituiscono 404', async () => {
    const { client } = await registeredClient(ctx);
    for (const id of ['abc', '0', '-1', '1.5', '99999999999999999999']) {
      assert.equal((await client.get(`/api/history/${id}`)).status, 404, id);
    }
  });

  test('classifica pubblica, ordinata, senza username né id', async () => {
    const anonymous = await ctx.client().get('/api/leaderboard');
    assert.equal(anonymous.status, 200);
    const { players, currentUser } = anonymous.data;
    assert.equal(currentUser, null);
    assert.ok(players.length >= 2);
    for (let i = 1; i < players.length; i += 1) assert.ok(players[i - 1].totalScore >= players[i].totalScore);
    for (const player of players) {
      assert.deepEqual(Object.keys(player).sort(), [
        'averageScore',
        'bestScore',
        'gamesPlayed',
        'isCurrentUser',
        'name',
        'rank',
        'totalScore',
      ]);
    }

    const mario = ctx.client();
    await mario.login();
    const mine = (await mario.get('/api/leaderboard')).data;
    assert.equal(mine.currentUser.name, 'Mario');
    assert.equal(mine.players.filter((p) => p.isCurrentUser).length, 1);
  });
});
