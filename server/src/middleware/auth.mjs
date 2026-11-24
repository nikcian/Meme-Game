import { unauthorized } from '../lib/errors.mjs';

/**
 * Carica l'utente della sessione dal database a ogni richiesta API, così un account
 * eliminato perde subito l'accesso. In sessione si salva solo l'id.
 * @param {ReturnType<typeof import('../repositories/users.mjs').createUserRepository>} users
 */
export function loadUser(users) {
  return (req, _res, next) => {
    const userId = req.session?.userId;
    req.user = typeof userId === 'number' ? users.findById(userId) : null;
    if (userId !== undefined && !req.user) delete req.session.userId;
    next();
  };
}

export function requireAuth(req, _res, next) {
  if (!req.user) throw unauthorized();
  next();
}

const promisify = (fn) =>
  new Promise((resolve, reject) => {
    fn((error) => (error ? reject(error) : resolve()));
  });

/** Nuovo id di sessione al login: previene la session fixation. */
export const regenerateSession = (req) => promisify((cb) => req.session.regenerate(cb));
export const saveSession = (req) => promisify((cb) => req.session.save(cb));
export const destroySession = (req) => promisify((cb) => req.session.destroy(cb));
