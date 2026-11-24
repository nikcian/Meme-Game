import { Router } from 'express';
import { notFound } from '../lib/errors.mjs';
import { parseId, queryInt } from '../lib/validation.mjs';
import { requireAuth } from '../middleware/auth.mjs';

/**
 * Storico personale, statistiche e classifica.
 * @param {{ games: ReturnType<typeof import('../repositories/games.mjs').createGameRepository> }} deps
 */
export function historyRoutes({ games }) {
  const router = Router();

  router.get('/history', requireAuth, (req, res) => {
    const limit = queryInt(req.query.limit, { min: 1, max: 50, fallback: 10 });
    const offset = queryInt(req.query.offset, { min: 0, max: 1_000_000, fallback: 0 });
    res.json({
      items: games.listForUser(req.user.id, { limit, offset }),
      total: games.countForUser(req.user.id),
      limit,
      offset,
    });
  });

  router.get('/history/stats', requireAuth, (req, res) => {
    res.json({ stats: games.statsForUser(req.user.id) });
  });

  router.get('/history/:id', requireAuth, (req, res) => {
    const game = games.findForUser(parseId(req.params.id, 'Partita non trovata.'), req.user.id);
    if (!game) throw notFound('Partita non trovata.');
    res.json({ game });
  });

  router.get('/leaderboard', (req, res) => {
    res.json(games.leaderboard({ limit: 10, userId: req.user?.id ?? null }));
  });

  return router;
}
