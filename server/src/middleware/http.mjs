import { HttpError, notFound } from '../lib/errors.mjs';

const COLORS = { 2: 32, 3: 36, 4: 33, 5: 31 };

/** Log compatto di ogni richiesta: metodo, percorso, stato e durata. */
export function requestLogger(logger = console) {
  const useColor = process.stdout.isTTY;
  return (req, res, next) => {
    const start = process.hrtime.bigint();
    res.on('finish', () => {
      const ms = Number(process.hrtime.bigint() - start) / 1e6;
      const status = useColor ? `\x1b[${COLORS[String(res.statusCode)[0]] ?? 0}m${res.statusCode}\x1b[0m` : res.statusCode;
      logger.info(`${req.method} ${req.originalUrl.split('?')[0]} ${status} ${ms.toFixed(1)}ms`);
    });
    next();
  };
}

/** 404 in JSON per gli endpoint API inesistenti. */
export function apiNotFound(_req, _res) {
  throw notFound('Endpoint non trovato.');
}

/**
 * Gestore centralizzato degli errori: risposte JSON coerenti, nessun dettaglio interno esposto
 * al client (stack trace e messaggi del database restano nei log del server).
 */
export function errorHandler(logger = console) {
  // eslint-disable-next-line no-unused-vars -- Express riconosce i gestori d'errore dalle 4 firme.
  return (error, req, res, next) => {
    if (res.headersSent) {
      req.socket.destroy();
      return;
    }

    let status = 500;
    let body = { error: 'Si è verificato un errore inatteso. Riprova tra poco.' };

    if (error instanceof HttpError) {
      status = error.status;
      body = { error: error.message, ...(error.details && { details: error.details }) };
      if (error.retryAfterSeconds) res.set('Retry-After', String(error.retryAfterSeconds));
    } else if (error?.type === 'entity.parse.failed') {
      status = 400;
      body = { error: 'Il corpo della richiesta non è un JSON valido.' };
    } else if (error?.type === 'entity.too.large') {
      status = 413;
      body = { error: 'Richiesta troppo grande.' };
    } else if (error?.status >= 400 && error?.status < 500 && error.expose) {
      status = error.status;
      body = { error: 'Richiesta non valida.' };
    } else {
      logger.error(`[${req.method} ${req.originalUrl}]`, error);
    }

    res.status(status).json(body);
  };
}
