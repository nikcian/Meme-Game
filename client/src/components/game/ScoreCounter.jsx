import { useEffect, useRef, useState } from 'react';

const easeOut = (t) => 1 - (1 - t) ** 3;
const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * Numero che "conta" fino al valore indicato. Con "riduci movimento" mostra subito il valore
 * finale; i lettori di schermo leggono sempre il valore reale, mai i passaggi intermedi.
 */
export function ScoreCounter({ value, from = null, duration = 900, className }) {
  const [shown, setShown] = useState(() => (from === null || reducedMotion() ? value : from));
  // Ultimo valore realmente mostrato: lo aggiornano solo i frame dell'animazione, mai il corpo
  // dell'effect. Così, se l'effect viene annullato e rieseguito (StrictMode in sviluppo, oppure
  // un nuovo valore a metà animazione), si riparte da ciò che l'utente vede davvero.
  const displayed = useRef(shown);

  useEffect(() => {
    const start = displayed.current;
    if (start === value) return undefined;
    let frame;
    const instant = reducedMotion();
    const begin = performance.now();
    const step = () => {
      // Sempre performance.now(): il timestamp passato da requestAnimationFrame può avere
      // un'origine diversa (o restare fermo), e l'animazione non arriverebbe mai alla fine.
      const elapsed = performance.now() - begin;
      const t = instant ? 1 : Math.min(1, Math.max(0, elapsed / duration));
      const current = Math.round(start + (value - start) * easeOut(t));
      displayed.current = current;
      setShown(current);
      if (t < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    // Rete di sicurezza: se i frame vengono rallentati o sospesi (scheda in background, dispositivi
    // lenti), il valore finale compare comunque allo scadere della durata dell'animazione.
    const fallback = setTimeout(() => {
      cancelAnimationFrame(frame);
      displayed.current = value;
      setShown(value);
    }, (instant ? 0 : duration) + 150);
    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(fallback);
    };
  }, [value, duration]);

  return (
    <span className={className} data-animating={shown !== value || undefined}>
      <span aria-hidden="true">{shown}</span>
      <span className="visually-hidden">{value}</span>
    </span>
  );
}
