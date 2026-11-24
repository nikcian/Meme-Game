import helmet from 'helmet';
import { forbidden } from '../lib/errors.mjs';

/**
 * Header di sicurezza. La Content-Security-Policy è restrittiva: solo risorse dallo stesso
 * origin, nessuno script o stile inline, nessun iframe.
 * @param {{ secureCookies: boolean }} config
 */
export function securityHeaders({ secureCookies }) {
  const helmetMiddleware = helmet({
    contentSecurityPolicy: {
      useDefaults: true,
      directives: {
        defaultSrc: ["'self'"],
        baseUri: ["'self'"],
        connectSrc: ["'self'"],
        fontSrc: ["'self'"],
        formAction: ["'self'"],
        frameAncestors: ["'none'"],
        imgSrc: ["'self'", 'data:'],
        manifestSrc: ["'self'"],
        objectSrc: ["'none'"],
        scriptSrc: ["'self'"],
        scriptSrcAttr: ["'none'"],
        styleSrc: ["'self'"],
        workerSrc: ["'self'"],
        upgradeInsecureRequests: secureCookies ? [] : null,
      },
    },
    strictTransportSecurity: secureCookies ? { maxAge: 31_536_000, includeSubDomains: true } : false,
    xFrameOptions: { action: 'deny' },
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  });

  return (req, res, next) => {
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=(), usb=()');
    helmetMiddleware(req, res, next);
  };
}

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * Protezione CSRF in profondità (oltre ai cookie SameSite=Strict): le richieste che modificano
 * dati devono provenire dallo stesso origin. Usa gli header Fetch Metadata dei browser moderni
 * e, in assenza, l'header Origin. I client non-browser (curl, test) non inviano questi header.
 * @param {{ allowedOrigins: string[] }} config
 */
export function sameOriginGuard({ allowedOrigins }) {
  const extraOrigins = new Set(allowedOrigins);
  return (req, _res, next) => {
    if (SAFE_METHODS.has(req.method)) return next();

    const site = req.get('sec-fetch-site');
    if (site && site !== 'same-origin' && site !== 'none') {
      throw forbidden('Richiesta bloccata: proviene da un altro sito.');
    }

    const origin = req.get('origin');
    if (origin !== undefined && !extraOrigins.has(origin)) {
      let host = null;
      try {
        host = new URL(origin).host;
      } catch {
        // "null" o valori malformati: trattati come origine estranea.
      }
      if (host === null || host !== req.get('host')) {
        throw forbidden('Richiesta bloccata: proviene da un altro sito.');
      }
    }
    next();
  };
}
