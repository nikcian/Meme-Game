import { Icon } from '../Icon.jsx';
import { ScoreCounter } from './ScoreCounter.jsx';

const DOT_LABEL = { correct: 'indovinato', wrong: 'sbagliato', timeout: 'tempo scaduto', current: 'in corso', pending: 'da giocare' };

/** Barra superiore della partita: round, avanzamento, punteggio e uscita. */
export function GameBar({ game, onQuit }) {
  const { round, results, totalRounds, mode, score } = game;
  const dots = Array.from({ length: totalRounds }, (_, index) => {
    const result = results.find((r) => r.position === index + 1);
    if (result) return result.isCorrect ? 'correct' : result.timedOut ? 'timeout' : 'wrong';
    return index + 1 === round.position ? 'current' : 'pending';
  });

  return (
    <div className="gamebar">
      <p className="gamebar__round">
        Round <strong>{round.position}</strong>
        <span className="gamebar__total">/{totalRounds}</span>
      </p>
      <ol className="dots" aria-label="Avanzamento della partita">
        {dots.map((status, index) => (
          <li key={index} className={`dot dot--${status}`}>
            <span className="visually-hidden">
              Round {index + 1}: {DOT_LABEL[status]}
            </span>
          </li>
        ))}
      </ol>
      <span className={`gamebar__mode chip ${mode === 'full' ? 'chip--violet' : ''}`}>
        <Icon name={mode === 'full' ? 'crown' : 'zap'} size={15} />
        {mode === 'full' ? 'Completa' : 'Veloce'}
      </span>
      <p className="gamebar__score" aria-live="polite">
        <span>Punti</span>
        <ScoreCounter value={score} className="gamebar__points" />
      </p>
      <button type="button" className="btn btn--sm btn--ghost gamebar__quit" onClick={onQuit}>
        <Icon name="door" size={18} /> <span>Esci</span>
      </button>
    </div>
  );
}
