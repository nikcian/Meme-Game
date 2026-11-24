import { existsSync } from 'node:fs';
import path from 'node:path';
import express from 'express';
import session from 'express-session';
import { RateLimiter, rateLimit } from './lib/rate-limiter.mjs';
import { SqliteSessionStore } from './lib/session-store.mjs';
import { loadUser } from './middleware/auth.mjs';
import { apiNotFound, errorHandler, requestLogger } from './middleware/http.mjs';
import { sameOriginGuard, securityHeaders } from './middleware/security.mjs';
import { createGameRepository } from './repositories/games.mjs';
import { createMemeRepository } from './repositories/memes.mjs';
import { createUserRepository } from './repositories/users.mjs';
import { authRoutes } from './routes/auth.mjs';
import { gameRoutes } from './routes/game.mjs';
import { historyRoutes } from './routes/history.mjs';
import { GameService } from './services/game-service.mjs';

/**
 * Compone l'applicazione Express. Non apre porte né legge l'ambiente: i test la creano
 * con un database in memoria e un orologio controllabile.
 *
 * @param {{
 *   config: ReturnType<typeof import('./config.mjs').loadConfig>,
 *   db: import('node:sqlite').DatabaseSync,
 *   clock?: { now: () => number },
 *   logger?: Pick<Console, 'info' | 'warn' | 'error'>,
 * }} options
 */
export function createApp({ config, db, clock, logger = console }) {
  const users = createUserRepository(db);
  const memes = createMemeRepository(db);
  const games = createGameRepository(db, config.game);
  const gameService = new GameService({ memes, games, rules: config.game, clock });
  const sessionStore = new SqliteSessionStore(db, { ttlMs: config.sessionMaxAgeMs });
  const apiLimiter = new RateLimiter({ windowMs: 60_000, max: 300 });

  // Prefisso __Host-: il browser accetta il cookie solo via HTTPS, senza Domain e con Path=/.
  const sessionCookie = {
    name: config.secureCookies ? '__Host-memegame.sid' : 'memegame.sid',
    options: { path: '/', httpOnly: true, sameSite: 'strict', secure: config.secureCookies },
  };

  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', config.trustProxy);

  app.use(securityHeaders(config));
  if (config.logRequests) app.use(requestLogger(logger));

  // Immagini dei meme: servite prima della sessione, così non toccano lo store.
  app.use('/static', express.static(config.memesDir, { maxAge: '7d', index: false, redirect: false }));

  const auth = authRoutes({ users, sessionCookie });
  const game = gameRoutes({ gameService });

  const api = express.Router();
  api.use(rateLimit(apiLimiter, { message: 'Troppe richieste. Rallenta un attimo.' }));
  api.use(sameOriginGuard(config));
  api.use(express.json({ limit: '10kb' }));
  api.use(
    session({
      name: sessionCookie.name,
      secret: config.sessionSecret,
      store: sessionStore,
      resave: false,
      saveUninitialized: false,
      rolling: true,
      unset: 'destroy',
      cookie: { ...sessionCookie.options, maxAge: config.sessionMaxAgeMs },
    }),
  );
  api.use(loadUser(users));
  api.get('/health', (_req, res) => res.json({ status: 'ok' }));
  api.use(auth);
  api.use(game);
  api.use(historyRoutes({ games }));
  api.use(apiNotFound);
  app.use('/api', api);

  if (config.serveClient) mountClient(app, config, logger);

  app.use((_req, res) => res.status(404).type('text/plain').send('Not found'));
  app.use(errorHandler(logger));

  return {
    app,
    gameService,
    close() {
      gameService.close();
      sessionStore.close();
      apiLimiter.close();
      auth.close();
      game.close();
    },
  };
}

/** In produzione Express serve anche il client compilato (un solo processo, un solo origin). */
function mountClient(app, { clientDistDir }, logger) {
  const indexFile = path.join(clientDistDir, 'index.html');
  if (!existsSync(indexFile)) {
    logger.warn(`Client non trovato in ${clientDistDir}: esegui "npm run build" per servirlo.`);
    return;
  }
  const assetsDir = `${path.sep}assets${path.sep}`;
  app.use(
    express.static(clientDistDir, {
      index: false,
      redirect: false,
      setHeaders(res, filePath) {
        // I file in /assets hanno l'hash nel nome: si possono mettere in cache per sempre.
        res.setHeader('Cache-Control', filePath.includes(assetsDir) ? 'public, max-age=31536000, immutable' : 'no-cache');
      },
    }),
  );
  // Fallback della SPA: le rotte del client restituiscono index.html (ma non i file mancanti).
  app.use((req, res, next) => {
    if (!['GET', 'HEAD'].includes(req.method) || path.extname(req.path) || !req.accepts('html')) return next();
    res.setHeader('Cache-Control', 'no-cache');
    res.sendFile(indexFile);
  });
}
