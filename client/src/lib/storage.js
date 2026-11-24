// Accesso a localStorage tollerante agli errori (modalità privata, quote, storage disabilitato).
// Le stringhe vengono salvate così come sono (le legge anche public/theme-init.js), il resto in JSON.

const PREFIX = 'memegame:';

export function readSetting(key, fallback) {
  try {
    const raw = window.localStorage.getItem(PREFIX + key);
    if (raw === null) return fallback;
    try {
      return JSON.parse(raw);
    } catch {
      return raw;
    }
  } catch {
    return fallback;
  }
}

export function writeSetting(key, value) {
  try {
    window.localStorage.setItem(PREFIX + key, typeof value === 'string' ? value : JSON.stringify(value));
  } catch {
    // Non critico: l'impostazione vale solo per questa sessione.
  }
}
