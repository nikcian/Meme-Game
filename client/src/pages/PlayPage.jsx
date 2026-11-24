import { useEffect, useEffectEvent, useRef, useState } from 'react';
import { useBlocker, useLocation, useNavigate, useNavigationType } from 'react-router';
import { Dialog } from '../components/Dialog.jsx';
import { ErrorState, PageLoader } from '../components/Feedback.jsx';
import { Icon } from '../components/Icon.jsx';
import { CountdownOverlay } from '../components/game/CountdownOverlay.jsx';
import { GameBar } from '../components/game/GameBar.jsx';
import { GameSummary } from '../components/game/GameSummary.jsx';
import { RoundView } from '../components/game/RoundView.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { usePreferences } from '../context/PreferencesContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { useDocumentTitle } from '../hooks/useDocumentTitle.js';
import { api, isAbortError } from '../lib/api.js';
import './PlayPage.css';

/**
 * Fasi: loading → countdown → playing (round e rivelazioni) → summary.
 * Il server è l'unica fonte di verità: qui si mostra lo stato che restituisce.
 */
export default function PlayPage() {
  useDocumentTitle('Gioca');
  const { status: authStatus } = useAuth();
  const { play } = usePreferences();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const navigationType = useNavigationType();

  const [phase, setPhase] = useState('loading');
  const [game, setGame] = useState(null);
  const [deadline, setDeadline] = useState(0);
  const [selected, setSelected] = useState(null);
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState(null);
  const [quitOpen, setQuitOpen] = useState(false);
  const [announcement, setAnnouncement] = useState('');

  const headingRef = useRef(null);
  const nextRef = useRef(null);
  // Blocca i doppi invii prima ancora del re-render (es. doppio click o Invio + click).
  const pendingRef = useRef(false);

  const inProgress = phase === 'playing' && game?.status === 'playing';
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) => inProgress && currentLocation.pathname !== nextLocation.pathname,
  );

  /** Mostra un nuovo stato di gioco ricevuto dal server. */
  function showRound(nextGame) {
    setGame(nextGame);
    setDeadline(performance.now() + nextGame.round.remainingMs);
    if (!nextGame.round.result) {
      setSelected(null);
      setAnnouncement(`Round ${nextGame.round.position} di ${nextGame.totalRounds}. Hai 30 secondi.`);
    }
    setPhase('playing');
  }

  // All'apertura: riprende la partita in corso, mostra il riepilogo dopo un refresh,
  // altrimenti parte il conto alla rovescia per una nuova partita.
  useEffect(() => {
    if (authStatus === 'loading') return undefined;
    const controller = new AbortController();
    api
      .getGame({ signal: controller.signal })
      .then(({ game: current }) => {
        if (current?.status === 'playing') {
          setGame(current);
          setDeadline(performance.now() + current.round.remainingMs);
          setSelected(null);
          setPhase('playing');
        } else if (current?.status === 'finished' && navigationType === 'POP') {
          setGame(current);
          setPhase('summary');
        } else {
          setPhase('countdown');
        }
      })
      .catch((err) => {
        if (isAbortError(err)) return;
        setError(err);
        setPhase('error');
      });
    return () => controller.abort();
  }, [authStatus, location.key, navigationType]);

  // Precarica l'immagine del prossimo round mentre si guardano i risultati.
  const upcomingUrl = game?.upcomingImage?.url;
  useEffect(() => {
    if (!upcomingUrl) return;
    const image = new Image();
    image.src = upcomingUrl;
  }, [upcomingUrl]);

  // Focus e scroll: a ogni nuovo round si torna in cima (il meme deve essere visibile, anche su mobile)
  // e il titolo riceve il focus; dopo la risposta il focus va su "avanti", che compare esattamente
  // dove c'era "Conferma", senza far saltare la pagina.
  const roundKey = game ? `${game.id}:${game.round.position}:${Boolean(game.round.result)}` : '';
  useEffect(() => {
    if (phase !== 'playing' || !game) return;
    if (game.round.result) {
      nextRef.current?.focus({ preventScroll: true });
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      headingRef.current?.focus({ preventScroll: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reagisce solo al cambio di round/esito
  }, [roundKey, phase]);

  async function startGame() {
    setBusy('start');
    try {
      const { game: created } = await api.startGame();
      showRound(created);
    } catch (err) {
      setError(err);
      setPhase('error');
    } finally {
      setBusy(null);
    }
  }

  /** Riallinea lo stato con il server (es. partita scaduta o doppio invio da un'altra scheda). */
  async function resync(message) {
    try {
      const { game: current } = await api.getGame();
      if (current) showRound(current);
      else {
        toast.info(message ?? 'La partita non è più disponibile: ne iniziamo una nuova.');
        setPhase('countdown');
      }
    } catch (err) {
      setError(err);
      setPhase('error');
    }
  }

  async function submitAnswer(captionId) {
    if (!game || game.round.result || pendingRef.current) return;
    pendingRef.current = true;
    setBusy('answer');
    try {
      const { game: answered } = await api.answer(game.round.position, captionId);
      setGame(answered);
      const { result } = answered.round;
      play(result.isCorrect ? 'correct' : result.timedOut ? 'timeout' : 'wrong');
      if (!result.isCorrect) navigator.vibrate?.(140);
      setAnnouncement(
        result.isCorrect
          ? `Esatto! Più ${result.points} punti.`
          : `${result.timedOut ? 'Tempo scaduto.' : 'Sbagliato.'} Le risposte giuste erano: ${result.correctCaptions.map((c) => c.text).join('; ')}.`,
      );
    } catch (err) {
      if (err.status === 404 || err.status === 409) await resync();
      else toast.error(err.message);
    } finally {
      pendingRef.current = false;
      setBusy(null);
    }
  }

  async function nextRound() {
    if (!game || pendingRef.current) return;
    pendingRef.current = true;
    setBusy('next');
    try {
      const { game: dealt } = await api.nextRound(game.round.position + 1);
      play('start');
      showRound(dealt);
    } catch (err) {
      if (err.status === 404 || err.status === 409) await resync();
      else toast.error(err.message);
    } finally {
      pendingRef.current = false;
      setBusy(null);
    }
  }

  function showSummary() {
    setPhase('summary');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function abandon() {
    try {
      await api.abandonGame();
    } catch {
      // Anche se la richiesta fallisce, la partita scadrà da sola sul server.
    }
  }

  async function confirmQuit() {
    setQuitOpen(false);
    await abandon();
    if (blocker.state === 'blocked') blocker.proceed();
    else navigate('/', { viewTransition: true });
  }

  function cancelQuit() {
    setQuitOpen(false);
    if (blocker.state === 'blocked') blocker.reset();
  }

  function select(captionId) {
    if (game?.round.result || captionId === selected) return;
    setSelected(captionId);
    play('select');
  }

  // Scorciatoie: 1–7 scelgono, Invio conferma o va avanti (se il focus non è già su un controllo).
  const onKeyDown = useEffectEvent((event) => {
    if (phase !== 'playing' || !game || quitOpen || blocker.state === 'blocked') return;
    if (event.altKey || event.ctrlKey || event.metaKey || event.repeat) return;
    const tag = event.target?.tagName;
    if (tag === 'TEXTAREA' || (tag === 'INPUT' && event.target.type !== 'radio')) return;

    if (!game.round.result && /^[1-9]$/.test(event.key)) {
      const caption = game.round.captions[Number(event.key) - 1];
      if (caption) {
        event.preventDefault();
        select(caption.id);
      }
      return;
    }
    // Su pulsanti e link Invio ha già il suo effetto nativo; sui radio no (dipende dal browser).
    if (event.key === 'Enter' && tag !== 'BUTTON' && tag !== 'A') {
      event.preventDefault();
      if (!game.round.result) {
        if (selected !== null) submitAnswer(selected);
      } else if (game.round.position === game.totalRounds) showSummary();
      else nextRound();
    }
  });

  useEffect(() => {
    const listener = (event) => onKeyDown(event);
    window.addEventListener('keydown', listener);
    return () => window.removeEventListener('keydown', listener);
  }, []);

  const handleSecond = (seconds) => {
    if (seconds === 10 || seconds === 5) setAnnouncement(`${seconds} secondi rimasti`);
    if (seconds > 0 && seconds <= 5) play('tick');
  };

  const quitDialog = (
    <Dialog
      open={quitOpen || blocker.state === 'blocked'}
      onClose={cancelQuit}
      title="Vuoi abbandonare la partita?"
      icon={<Icon name="door" size={28} />}
      actions={
        <>
          <button type="button" className="btn" onClick={cancelQuit} autoFocus>
            Continua a giocare
          </button>
          <button type="button" className="btn btn--danger" onClick={confirmQuit}>
            Abbandona
          </button>
        </>
      }
    >
      <p>La partita in corso andrà persa e non verrà salvata nello storico.</p>
    </Dialog>
  );

  let content;
  if (phase === 'loading') content = <PageLoader label="Preparazione della partita…" />;
  else if (phase === 'error') {
    content = (
      <ErrorState
        title="Impossibile avviare la partita"
        message={error?.message}
        onRetry={() => {
          setError(null);
          setPhase('countdown');
        }}
      />
    );
  } else if (phase === 'countdown') {
    content = <CountdownOverlay mode={authStatus === 'authenticated' ? 'full' : 'guest'} onDone={startGame} />;
  } else if (phase === 'summary' && game) {
    content = <GameSummary game={game} onPlayAgain={() => setPhase('countdown')} busy={busy === 'start'} />;
  } else if (game) {
    content = (
      <>
        <GameBar game={game} onQuit={() => setQuitOpen(true)} />
        <RoundView
          game={game}
          deadline={deadline}
          selected={selected}
          busy={busy}
          onSelect={select}
          onSubmit={submitAnswer}
          onNext={nextRound}
          onFinish={showSummary}
          onExpire={() => {
            if (!game.round.result && !busy) submitAnswer(null);
          }}
          onSecond={handleSecond}
          headingRef={headingRef}
          nextRef={nextRef}
        />
      </>
    );
  }

  return (
    <div className="container play">
      {content}
      <p className="visually-hidden" aria-live="polite" aria-atomic="true">
        {announcement}
      </p>
      {quitDialog}
    </div>
  );
}
