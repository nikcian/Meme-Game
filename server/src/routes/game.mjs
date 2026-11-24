import { Router } from 'express';
import { notFound } from '../lib/errors.mjs';
import { RateLimiter, rateLimit } from '../lib/rate-limiter.mjs';
import { integer, nullable, validateBody } from '../lib/validation.mjs';

const roundSchema = { round: integer({ label: 'Il round', min: 1, max: 100 }) };
const answerSchema = { ...roundSchema, captionId: nullable(integer({ label: 'La didascalia', min: 1 })) };

/**
 * Partita in corso della sessione corrente (risorsa singola: /api/game).
 * @param {{ gameService: import('../services/game-service.mjs').GameService }} deps
 */
export function gameRoutes({ gameService }) {
  const router = Router();
  const starts = new RateLimiter({ windowMs: 60_000, max: 20 });

  const userIdOf = (req) => req.user?.id ?? null;

  function requireGame(req) {
    const game = gameService.find(req.session.gameId, userIdOf(req));
    if (!game) throw notFound('Nessuna partita in corso: iniziane una nuova.');
    return game;
  }

  router.get('/game', (req, res) => {
    const game = gameService.find(req.session.gameId, userIdOf(req));
    if (!game && req.session.gameId) delete req.session.gameId;
    res.json({ game: game ? gameService.view(gameService.refresh(game)) : null });
  });

  router.post(
    '/game',
    rateLimit(starts, { message: 'Stai iniziando troppe partite. Aspetta qualche secondo.' }),
    (req, res) => {
      gameService.abandon(req.session.gameId);
      const game = gameService.start({ userId: userIdOf(req) });
      req.session.gameId = game.id;
      res.status(201).json({ game: gameService.view(game) });
    },
  );

  router.post('/game/answer', (req, res) => {
    const { round, captionId } = validateBody(answerSchema, req.body);
    const game = gameService.answer(requireGame(req), { position: round, captionId });
    res.json({ game: gameService.view(game) });
  });

  router.post('/game/next', (req, res) => {
    const { round } = validateBody(roundSchema, req.body);
    const game = gameService.next(requireGame(req), { position: round });
    res.json({ game: gameService.view(game) });
  });

  router.delete('/game', (req, res) => {
    gameService.abandon(req.session.gameId);
    delete req.session.gameId;
    res.status(204).end();
  });

  router.close = () => starts.close();
  return router;
}
