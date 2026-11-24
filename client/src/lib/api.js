/** Errore restituito dalle API, con messaggio già pronto per l'utente. */
export class ApiError extends Error {
  /**
   * @param {number} status
   * @param {string} message
   * @param {Record<string, string>} [details] errori per campo (validazione)
   */
  constructor(status, message, details) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }
}

const FALLBACK_MESSAGES = {
  0: 'Impossibile contattare il server. Controlla la connessione e riprova.',
  401: 'Devi accedere per continuare.',
  403: 'Operazione non consentita.',
  404: 'Risorsa non trovata.',
  429: 'Troppe richieste: aspetta qualche secondo.',
  500: 'Il server ha avuto un problema. Riprova tra poco.',
};

const unauthorizedListeners = new Set();

/** Notifica quando il server risponde 401 (es. sessione scaduta) per riallineare lo stato di login. */
export function onUnauthorized(listener) {
  unauthorizedListeners.add(listener);
  return () => unauthorizedListeners.delete(listener);
}

export const isAbortError = (error) => error?.name === 'AbortError';

async function request(path, { method = 'GET', body, signal } = {}) {
  let response;
  try {
    response = await fetch(`/api${path}`, {
      method,
      signal,
      credentials: 'same-origin',
      headers: body === undefined ? { Accept: 'application/json' } : { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch (error) {
    if (isAbortError(error)) throw error;
    throw new ApiError(0, FALLBACK_MESSAGES[0]);
  }

  if (response.status === 204) return null;
  const data = response.headers.get('content-type')?.includes('application/json')
    ? await response.json().catch(() => null)
    : null;

  if (!response.ok) {
    if (response.status === 401) unauthorizedListeners.forEach((listener) => listener());
    const message =
      data?.error ?? FALLBACK_MESSAGES[response.status] ?? FALLBACK_MESSAGES[response.status >= 500 ? 500 : 0];
    throw new ApiError(response.status, message, data?.details);
  }
  return data;
}

export const api = {
  // Sessione e account
  getSession: (options) => request('/session', options),
  login: (credentials) => request('/session', { method: 'POST', body: credentials }),
  logout: () => request('/session', { method: 'DELETE' }),
  register: (account) => request('/users', { method: 'POST', body: account }),

  // Partita in corso
  getGame: (options) => request('/game', options),
  startGame: () => request('/game', { method: 'POST' }),
  answer: (round, captionId) => request('/game/answer', { method: 'POST', body: { round, captionId } }),
  nextRound: (round) => request('/game/next', { method: 'POST', body: { round } }),
  abandonGame: () => request('/game', { method: 'DELETE' }),

  // Storico e classifica
  getHistory: ({ limit = 10, offset = 0, signal } = {}) => request(`/history?limit=${limit}&offset=${offset}`, { signal }),
  getStats: (options) => request('/history/stats', options),
  getLeaderboard: (options) => request('/leaderboard', options),
};
