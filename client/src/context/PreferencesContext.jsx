import { createContext, use, useCallback, useEffect, useMemo, useState } from 'react';
import { sounds } from '../lib/sound.js';
import { readSetting, writeSetting } from '../lib/storage.js';

const PreferencesContext = createContext(null);

const prefersReducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Tema chiaro/scuro (segue il sistema finché l'utente non sceglie) e suoni on/off. */
export function PreferencesProvider({ children }) {
  const [theme, setTheme] = useState(() => (document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light'));
  const [soundOn, setSoundOn] = useState(() => readSetting('sound', true) !== false);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  useEffect(() => {
    const query = window.matchMedia('(prefers-color-scheme: dark)');
    const follow = () => {
      if (readSetting('theme', null) === null) setTheme(query.matches ? 'dark' : 'light');
    };
    query.addEventListener('change', follow);
    return () => query.removeEventListener('change', follow);
  }, []);

  const toggleTheme = useCallback(() => {
    const next = theme === 'dark' ? 'light' : 'dark';
    writeSetting('theme', next);
    const apply = () => {
      document.documentElement.dataset.theme = next;
      setTheme(next);
    };
    // Dissolvenza tra i temi dove supportata (View Transitions API).
    if (document.startViewTransition && !prefersReducedMotion()) document.startViewTransition(apply);
    else apply();
  }, [theme]);

  const toggleSound = useCallback(() => {
    const next = !soundOn;
    writeSetting('sound', next);
    setSoundOn(next);
    if (next) sounds.select();
  }, [soundOn]);

  /** Riproduce un effetto se l'audio è attivo. */
  const play = useCallback((name) => {
    if (soundOn) sounds[name]?.();
  }, [soundOn]);

  const value = useMemo(
    () => ({ theme, toggleTheme, soundOn, toggleSound, play }),
    [theme, toggleTheme, soundOn, toggleSound, play],
  );
  return <PreferencesContext value={value}>{children}</PreferencesContext>;
}

export function usePreferences() {
  const context = use(PreferencesContext);
  if (!context) throw new Error('usePreferences deve essere usato dentro <PreferencesProvider>.');
  return context;
}
