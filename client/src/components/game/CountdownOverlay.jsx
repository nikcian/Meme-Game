import { useEffect, useEffectEvent, useRef, useState } from 'react';
import { usePreferences } from '../../context/PreferencesContext.jsx';
import { Icon } from '../Icon.jsx';

const STEPS = ['3', '2', '1', 'Via!'];
const STEP_MS = 650;

/**
 * "3, 2, 1, via!" prima della partita. È solo scenografia: il tempo del round parte
 * sul server quando la partita viene creata, cioè alla fine del conto alla rovescia.
 */
export function CountdownOverlay({ mode, onDone }) {
  const { play } = usePreferences();
  const [step, setStep] = useState(0);
  const finish = useEffectEvent(() => onDone());
  const beep = useEffectEvent((index) => play(index === STEPS.length - 1 ? 'start' : 'tick'));
  // Un solo suono per passo, anche se l'effect viene rieseguito (StrictMode in sviluppo).
  const beeped = useRef(-1);

  useEffect(() => {
    if (beeped.current !== step) {
      beeped.current = step;
      beep(step);
    }
    const timer = setTimeout(() => {
      if (step < STEPS.length - 1) setStep(step + 1);
      else finish();
    }, step === STEPS.length - 1 ? 380 : STEP_MS);
    return () => clearTimeout(timer);
  }, [step]);

  return (
    <div className="countdown" role="status" aria-live="assertive">
      <div className="countdown__card card">
        <p className="countdown__mode chip">
          <Icon name={mode === 'full' ? 'crown' : 'zap'} size={16} />
          {mode === 'full' ? 'Partita completa · 3 round' : 'Partita veloce · 1 round'}
        </p>
        <span key={step} className={`countdown__value${step === STEPS.length - 1 ? ' countdown__value--go' : ''}`}>
          {STEPS[step]}
        </span>
        <ul className="countdown__rules">
          <li>
            <Icon name="target" size={18} /> 7 didascalie, 2 giuste
          </li>
          <li>
            <Icon name="clock" size={18} /> 30 secondi a round
          </li>
          <li>
            <Icon name="sparkles" size={18} /> +5 punti a risposta esatta
          </li>
        </ul>
      </div>
    </div>
  );
}
