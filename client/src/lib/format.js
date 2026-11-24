const LOCALE = 'it-IT';

const dateFormat = new Intl.DateTimeFormat(LOCALE, { day: 'numeric', month: 'short', year: 'numeric' });
const timeFormat = new Intl.DateTimeFormat(LOCALE, { hour: '2-digit', minute: '2-digit' });
const relativeFormat = new Intl.RelativeTimeFormat(LOCALE, { numeric: 'auto' });
const integerFormat = new Intl.NumberFormat(LOCALE);
const decimalFormat = new Intl.NumberFormat(LOCALE, { maximumFractionDigits: 1 });
const percentFormat = new Intl.NumberFormat(LOCALE, { style: 'percent', maximumFractionDigits: 0 });

export const formatDate = (iso) => dateFormat.format(new Date(iso));
export const formatTime = (iso) => timeFormat.format(new Date(iso));
export const formatInteger = (value) => integerFormat.format(value);
export const formatDecimal = (value) => decimalFormat.format(value);
export const formatPercent = (ratio) => percentFormat.format(ratio);

/** "4,2 s" */
export const formatSeconds = (ms) => `${decimalFormat.format(ms / 1000)} s`;

const UNITS = [
  ['year', 365 * 24 * 3600],
  ['month', 30 * 24 * 3600],
  ['week', 7 * 24 * 3600],
  ['day', 24 * 3600],
  ['hour', 3600],
  ['minute', 60],
];

/** "2 giorni fa", "ieri", "adesso". */
export function formatRelative(iso, now = Date.now()) {
  const seconds = (new Date(iso).getTime() - now) / 1000;
  for (const [unit, size] of UNITS) {
    if (Math.abs(seconds) >= size) return relativeFormat.format(Math.round(seconds / size), unit);
  }
  return 'adesso';
}

/** Giudizio di fine partita in base alla percentuale di punti ottenuti. */
export function verdictFor(score, maxScore) {
  const ratio = maxScore ? score / maxScore : 0;
  if (ratio === 1) return { title: maxScore > 5 ? 'Leggenda dei meme!' : 'Centro perfetto!', tone: 'gold' };
  if (ratio >= 0.6) return { title: 'Meme master!', tone: 'great' };
  if (ratio > 0) return { title: 'Niente male!', tone: 'good' };
  return { title: 'Il meme ha vinto', tone: 'bad' };
}

/** Riga di emoji in stile "Wordle" per condividere il risultato. */
export const resultEmojis = (results) => results.map((r) => (r.isCorrect ? '🟩' : r.timedOut ? '⏰' : '🟥')).join('');

/** Iniziali per l'avatar. */
export function initials(name = '') {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return (parts.length > 1 ? parts[0][0] + parts[1][0] : (parts[0] ?? '?').slice(0, 1)).toUpperCase();
}

const AVATAR_COLORS = ['var(--cyan)', 'var(--yellow)', 'var(--pink)', 'var(--orange)', 'var(--green)'];

/** Colore stabile dell'avatar, derivato dal nome. */
export function avatarColor(name = '') {
  let hash = 0;
  for (const char of name) hash = (hash * 31 + char.codePointAt(0)) >>> 0;
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}
