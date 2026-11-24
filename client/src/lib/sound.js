// Effetti sonori sintetizzati con la Web Audio API: nessun file audio da scaricare.
// L'AudioContext viene creato solo dopo un'interazione dell'utente (requisito dei browser).

let context = null;

function audio() {
  if (typeof window === 'undefined') return null;
  const AudioContextClass = window.AudioContext ?? window.webkitAudioContext;
  if (!AudioContextClass) return null;
  context ??= new AudioContextClass();
  if (context.state === 'suspended') context.resume().catch(() => {});
  return context;
}

/**
 * @param {{ frequency: number, to?: number, type?: OscillatorType, duration?: number, volume?: number, delay?: number }} note
 */
function tone({ frequency, to, type = 'triangle', duration = 0.12, volume = 0.15, delay = 0 }) {
  const ctx = audio();
  if (!ctx) return;
  const start = ctx.currentTime + delay;
  const oscillator = ctx.createOscillator();
  const gain = ctx.createGain();
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, start);
  if (to) oscillator.frequency.exponentialRampToValueAtTime(to, start + duration);
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(volume, start + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  oscillator.connect(gain).connect(ctx.destination);
  oscillator.start(start);
  oscillator.stop(start + duration + 0.02);
}

const arpeggio = (frequencies, { step = 0.08, ...note } = {}) =>
  frequencies.forEach((frequency, index) => tone({ frequency, delay: index * step, ...note }));

export const sounds = {
  /** Sblocca l'audio al primo click (alcuni browser lo richiedono). */
  unlock: () => audio(),
  select: () => tone({ frequency: 620, duration: 0.06, volume: 0.08 }),
  tick: () => tone({ frequency: 1180, type: 'square', duration: 0.04, volume: 0.035 }),
  start: () => arpeggio([392, 523.25], { step: 0.09, duration: 0.14, volume: 0.1 }),
  correct: () => arpeggio([523.25, 659.25, 783.99, 1046.5], { duration: 0.2, volume: 0.12 }),
  wrong: () => tone({ frequency: 240, to: 110, type: 'sawtooth', duration: 0.36, volume: 0.07 }),
  timeout: () => arpeggio([330, 262], { step: 0.16, type: 'square', duration: 0.18, volume: 0.05 }),
  victory: () => arpeggio([523.25, 659.25, 783.99, 1046.5, 1318.5], { step: 0.11, duration: 0.3, volume: 0.11 }),
};
