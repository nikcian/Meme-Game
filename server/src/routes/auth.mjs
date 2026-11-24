import { Router } from 'express';
import { tooManyRequests, unauthorized } from '../lib/errors.mjs';
import { hashPassword, needsRehash, verifyAgainstDummy, verifyPassword } from '../lib/passwords.mjs';
import { RateLimiter, rateLimit } from '../lib/rate-limiter.mjs';
import { string, validateBody } from '../lib/validation.mjs';
import { destroySession, regenerateSession, saveSession } from '../middleware/auth.mjs';
import { toPublicUser } from '../repositories/users.mjs';

const loginSchema = {
  username: string({ label: 'Lo username', max: 64 }),
  password: string({ label: 'La password', max: 256, trim: false }),
};

const registrationSchema = {
  username: string({
    label: 'Lo username',
    min: 3,
    max: 24,
    pattern: /^[a-zA-Z0-9._-]+$/,
    patternMessage: 'Usa solo lettere, numeri, punto, trattino e underscore.',
  }),
  name: string({ label: 'Il nome', max: 40 }),
  password: string({ label: 'La password', min: 8, max: 128, trim: false }),
};

/**
 * Sessione (login/logout/utente corrente) e registrazione.
 * @param {{ users: ReturnType<typeof import('../repositories/users.mjs').createUserRepository>, sessionCookie: { name: string, options: object } }} deps
 */
export function authRoutes({ users, sessionCookie }) {
  const router = Router();

  // Brute force: max 5 errori per coppia IP+username e 30 tentativi per IP ogni 15 minuti.
  const failedLogins = new RateLimiter({ windowMs: 15 * 60_000, max: 5 });
  const loginAttempts = new RateLimiter({ windowMs: 15 * 60_000, max: 30 });
  const registrations = new RateLimiter({ windowMs: 60 * 60_000, max: 10 });

  async function startSession(req, userId) {
    await regenerateSession(req);
    req.session.userId = userId;
    await saveSession(req);
  }

  router.get('/session', (req, res) => {
    res.json({ user: req.user ? toPublicUser(req.user) : null });
  });

  router.post(
    '/session',
    rateLimit(loginAttempts, { message: 'Troppi tentativi di accesso. Riprova più tardi.' }),
    async (req, res) => {
      const { username, password } = validateBody(loginSchema, req.body);
      const throttleKey = `${req.ip}|${username.toLowerCase()}`;
      const waitSeconds = failedLogins.blockedFor(throttleKey);
      if (waitSeconds > 0) {
        throw tooManyRequests('Troppi tentativi falliti. Riprova tra qualche minuto.', waitSeconds);
      }

      const account = users.findCredentials(username);
      const valid = account ? await verifyPassword(password, account.passwordHash) : await verifyAgainstDummy(password);
      if (!account || !valid) {
        failedLogins.hit(throttleKey);
        throw unauthorized('Username o password non corretti.');
      }

      failedLogins.reset(throttleKey);
      if (needsRehash(account.passwordHash)) users.updatePasswordHash(account.id, await hashPassword(password));
      await startSession(req, account.id);
      res.json({ user: toPublicUser(account) });
    },
  );

  router.delete('/session', async (req, res) => {
    await destroySession(req);
    res.clearCookie(sessionCookie.name, sessionCookie.options);
    res.status(204).end();
  });

  router.post(
    '/users',
    rateLimit(registrations, { message: 'Troppe registrazioni da questa rete. Riprova più tardi.' }),
    async (req, res) => {
      const input = validateBody(registrationSchema, req.body);
      const id = users.create({ ...input, passwordHash: await hashPassword(input.password) });
      await startSession(req, id);
      res.status(201).json({ user: toPublicUser(users.findById(id)) });
    },
  );

  router.close = () => [failedLogins, loginAttempts, registrations].forEach((l) => l.close());
  return router;
}
