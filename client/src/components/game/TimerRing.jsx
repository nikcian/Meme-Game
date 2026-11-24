import { useEffect, useEffectEvent, useRef, useState } from 'react';

/**
 * Countdown circolare. L'anello si aggiorna a ogni frame direttamente sul DOM (nessun re-render),
 * mentre React ridisegna solo quando cambia il secondo mostrato.
 *
 * @param {{
 *   deadline: number,            // istante di scadenza, sulla scala di performance.now()
 *   durationMs: number,
 *   initialRemainingMs: number,
 *   paused?: boolean,
 *   onExpire?: () => void,
 *   onSecond?: (seconds: number) => void,
 * }} props
 */
export function TimerRing({ deadline, durationMs, initialRemainingMs, paused = false, onExpire, onSecond }) {
  const barRef = useRef(null);
  const [seconds, setSeconds] = useState(Math.ceil(initialRemainingMs / 1000));
  const expire = useEffectEvent(() => onExpire?.());
  const second = useEffectEvent((value) => onSecond?.(value));

  useEffect(() => {
    if (paused) return undefined;
    let frame;
    let shown = -1;
    const loop = () => {
      const remaining = Math.max(0, deadline - performance.now());
      barRef.current?.style.setProperty('stroke-dashoffset', String(100 - (remaining / durationMs) * 100));
      const value = Math.ceil(remaining / 1000);
      if (value !== shown) {
        shown = value;
        setSeconds(value);
        second(value);
      }
      if (remaining > 0) frame = requestAnimationFrame(loop);
      else expire();
    };
    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
  }, [deadline, durationMs, paused]);

  const level = paused ? 'paused' : seconds > 10 ? 'calm' : seconds > 5 ? 'warn' : 'danger';
  return (
    <div className="timer" data-level={level} role="timer" aria-label={`Tempo rimasto: ${seconds} secondi`}>
      <svg viewBox="0 0 100 100" aria-hidden="true">
        <circle className="timer__track" cx="50" cy="50" r="42" pathLength="100" />
        <circle
          ref={barRef}
          className="timer__bar"
          cx="50"
          cy="50"
          r="42"
          pathLength="100"
          style={{ strokeDashoffset: 100 - (initialRemainingMs / durationMs) * 100 }}
        />
      </svg>
      <span className="timer__value" aria-hidden="true">
        {seconds}
      </span>
    </div>
  );
}
