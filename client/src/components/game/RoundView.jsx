import { Spinner } from '../Feedback.jsx';
import { Icon } from '../Icon.jsx';
import { MemeCard } from '../MemeCard.jsx';
import { TimerRing } from './TimerRing.jsx';

function resultCopy(result, points) {
  if (result.isCorrect) return { title: `Esatto! +${points} punti`, stamp: 'Esatto!', tone: 'win' };
  if (result.timedOut) return { title: 'Tempo scaduto!', stamp: 'Tempo!', tone: 'timeout' };
  return { title: 'Sbagliato!', stamp: 'Nope', tone: 'lose' };
}

/**
 * Un round: meme con anteprima della didascalia scelta, timer e scelte (radio nativi:
 * frecce, Tab e lettori di schermo funzionano senza codice aggiuntivo).
 */
export function RoundView({
  game,
  deadline,
  selected,
  busy,
  onSelect,
  onSubmit,
  onNext,
  onFinish,
  onExpire,
  onSecond,
  headingRef,
  nextRef,
}) {
  const { round } = game;
  const { result } = round;
  const isLast = round.position === game.totalRounds;
  const correctIds = new Set(result?.correctCaptions.map((c) => c.id) ?? []);
  const copy = result ? resultCopy(result, game.pointsPerCorrectAnswer) : null;

  // Prima della risposta: anteprima della scelta. Dopo: il meme "vero".
  const overlay = result
    ? (result.isCorrect ? result.selectedCaption : result.correctCaptions[0]).text
    : (round.captions.find((c) => c.id === selected)?.text ?? null);

  function captionState(caption) {
    if (!result) return selected === caption.id ? 'selected' : 'idle';
    const chosen = result.selectedCaption?.id === caption.id;
    if (correctIds.has(caption.id)) return chosen ? 'won' : 'correct';
    return chosen ? 'wrong' : 'dim';
  }

  return (
    <div className={`round${result ? ` round--revealed round--${copy.tone}` : ''}`}>
      <div className="round__stage">
        <MemeCard image={round.image} caption={overlay} priority className="round__meme">
          {copy && (
            <span className={`stamp stamp--${copy.tone}`} aria-hidden="true">
              {copy.stamp}
            </span>
          )}
        </MemeCard>
        <div className="round__timer">
          <TimerRing
            key={`${game.id}-${round.position}`}
            deadline={deadline}
            durationMs={game.roundDurationMs}
            initialRemainingMs={round.remainingMs}
            paused={Boolean(result) || busy === 'answer'}
            onExpire={onExpire}
            onSecond={onSecond}
          />
        </div>
      </div>

      <form
        className="round__panel"
        onSubmit={(event) => {
          event.preventDefault();
          if (!result && selected !== null && !busy) onSubmit(selected);
        }}
      >
        <header className="round__head">
          <h1 ref={headingRef} tabIndex={-1} className="round__title">
            {copy ? copy.title : 'Scegli la didascalia giusta'}
          </h1>
          <p className="round__subtitle">
            {result
              ? 'Le didascalie giuste sono evidenziate in verde.'
              : 'Solo due delle sette frasi sono quelle originali di questo meme.'}
          </p>
        </header>

        <fieldset className="captions" disabled={Boolean(result)}>
          <legend className="visually-hidden">Didascalie possibili</legend>
          {round.captions.map((caption, index) => {
            const state = captionState(caption);
            return (
              <label key={caption.id} className={`caption caption--${state}`} style={{ '--i': index }}>
                <input
                  type="radio"
                  name="caption"
                  value={caption.id}
                  checked={selected === caption.id}
                  onChange={() => onSelect(caption.id)}
                />
                <span className="caption__key" aria-hidden="true">
                  {index + 1}
                </span>
                <span className="caption__text">{caption.text}</span>
                {(state === 'won' || state === 'correct') && (
                  <span className="caption__tag caption__tag--ok">
                    <Icon name="check" size={15} strokeWidth={3} /> Giusta
                  </span>
                )}
                {state === 'wrong' && (
                  <span className="caption__tag caption__tag--ko">
                    <Icon name="x" size={15} strokeWidth={3} /> La tua
                  </span>
                )}
              </label>
            );
          })}
        </fieldset>

        <div className="round__actions">
          {result ? (
            <button
              ref={nextRef}
              type="button"
              className="btn btn--accent btn--lg"
              onClick={isLast ? onFinish : onNext}
              disabled={Boolean(busy)}
            >
              {busy === 'next' ? <Spinner label="Preparazione del round…" /> : null}
              {isLast ? 'Vedi il risultato' : 'Round successivo'} <Icon name="arrow-right" />
            </button>
          ) : (
            <button type="submit" className="btn btn--primary btn--lg" disabled={selected === null || Boolean(busy)}>
              {busy === 'answer' ? <Spinner label="Verifica in corso…" /> : <Icon name="check" />} Conferma
            </button>
          )}
          <p className="round__hint">
            <Icon name="keyboard" size={18} />
            {result ? (
              <span>
                <kbd>Invio</kbd> per continuare
              </span>
            ) : (
              <span>
                <kbd>1</kbd>–<kbd>7</kbd> per scegliere, <kbd>Invio</kbd> per confermare
              </span>
            )}
          </p>
        </div>
      </form>
    </div>
  );
}
