/** Errore HTTP con messaggio pensato per essere mostrato all'utente. */
export class HttpError extends Error {
  /**
   * @param {number} status
   * @param {string} message
   * @param {{ details?: Record<string, string>, retryAfterSeconds?: number }} [extra]
   */
  constructor(status, message, { details, retryAfterSeconds } = {}) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
    this.details = details;
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

export const badRequest = (message, details) => new HttpError(400, message, { details });
export const unauthorized = (message = 'Devi accedere per continuare.') => new HttpError(401, message);
export const forbidden = (message = 'Operazione non consentita.') => new HttpError(403, message);
export const notFound = (message = 'Risorsa non trovata.') => new HttpError(404, message);
export const conflict = (message, details) => new HttpError(409, message, { details });
export const tooManyRequests = (message, retryAfterSeconds) =>
  new HttpError(429, message, { retryAfterSeconds });
