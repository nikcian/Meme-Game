import { badRequest, notFound } from './errors.mjs';

// Validazione minimale e senza dipendenze: ogni regola restituisce il valore normalizzato
// oppure lancia un ValidationIssue con un messaggio in italiano per il campo.

class ValidationIssue extends Error {}

// eslint-disable-next-line no-control-regex
const CONTROL_CHARS = /[\u0000-\u001f\u007f]/;

/**
 * @param {{ label: string, min?: number, max: number, pattern?: RegExp, patternMessage?: string, trim?: boolean }} rule
 */
export function string({ label, min = 1, max, pattern, patternMessage, trim = true }) {
  return (value) => {
    if (typeof value !== 'string') throw new ValidationIssue(`${label} è obbligatorio.`);
    const text = trim ? value.trim() : value;
    if (CONTROL_CHARS.test(text)) throw new ValidationIssue(`${label} contiene caratteri non validi.`);
    const length = [...text].length;
    if (length < min) {
      throw new ValidationIssue(min <= 1 ? `${label} è obbligatorio.` : `${label} deve avere almeno ${min} caratteri.`);
    }
    if (length > max) throw new ValidationIssue(`${label} può avere al massimo ${max} caratteri.`);
    if (pattern && !pattern.test(text)) throw new ValidationIssue(patternMessage ?? `${label} non è valido.`);
    return text;
  };
}

/** @param {{ label: string, min?: number, max?: number }} rule */
export function integer({ label, min = Number.MIN_SAFE_INTEGER, max = Number.MAX_SAFE_INTEGER }) {
  return (value) => {
    if (!Number.isSafeInteger(value) || value < min || value > max) {
      throw new ValidationIssue(`${label} non è valido.`);
    }
    return value;
  };
}

/** Accetta `null` (o un campo assente) oltre ai valori ammessi dalla regola interna. */
export function nullable(rule) {
  return (value) => (value === null || value === undefined ? null : rule(value));
}

/**
 * Valida un body JSON secondo uno schema `{ campo: regola }`. I campi non previsti vengono ignorati.
 * @template {Record<string, (value: unknown) => any>} S
 * @param {S} schema
 * @param {unknown} body
 * @returns {{ [K in keyof S]: ReturnType<S[K]> }}
 */
export function validateBody(schema, body) {
  if (body === null || typeof body !== 'object' || Array.isArray(body)) {
    throw badRequest('Il corpo della richiesta deve essere un oggetto JSON.');
  }
  const value = {};
  const details = {};
  for (const [field, rule] of Object.entries(schema)) {
    try {
      value[field] = rule(body[field]);
    } catch (error) {
      if (!(error instanceof ValidationIssue)) throw error;
      details[field] = error.message;
    }
  }
  if (Object.keys(details).length > 0) throw badRequest('Controlla i campi evidenziati.', details);
  return /** @type {any} */ (value);
}

/** Converte un parametro di percorso in id numerico; un id malformato equivale a una risorsa inesistente. */
export function parseId(raw, message) {
  if (!/^[1-9]\d{0,15}$/.test(raw ?? '')) throw notFound(message);
  const id = Number(raw);
  if (!Number.isSafeInteger(id)) throw notFound(message);
  return id;
}

/** Legge un intero da query string, limitandolo all'intervallo indicato. */
export function queryInt(raw, { min, max, fallback }) {
  if (typeof raw !== 'string' || !/^\d{1,9}$/.test(raw)) return fallback;
  return Math.min(max, Math.max(min, Number(raw)));
}
