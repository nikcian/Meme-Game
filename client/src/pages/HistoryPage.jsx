import { useEffect, useState } from 'react';
import { EmptyState, ErrorState, PlayLink, Spinner } from '../components/Feedback.jsx';
import { Icon } from '../components/Icon.jsx';
import { MemeCard } from '../components/MemeCard.jsx';
import { ScoreChart } from '../components/ScoreChart.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { useDocumentTitle } from '../hooks/useDocumentTitle.js';
import { api, isAbortError } from '../lib/api.js';
import {
  formatDate,
  formatDecimal,
  formatInteger,
  formatPercent,
  formatRelative,
  formatSeconds,
  formatTime,
} from '../lib/format.js';
import './HistoryPage.css';

const PAGE_SIZE = 8;

function StatTile({ icon, label, value, detail, tone }) {
  return (
    <div className={`stat card stat--${tone}`}>
      <span className="stat__icon" aria-hidden="true">
        <Icon name={icon} size={22} />
      </span>
      <p className="stat__label">{label}</p>
      <p className="stat__value">{value}</p>
      {detail && <p className="stat__detail">{detail}</p>}
    </div>
  );
}

function MemeInsight({ title, insight, verb }) {
  if (!insight) return null;
  return (
    <div className="insight">
      <img
        className="insight__img"
        src={insight.image.url}
        alt={insight.image.alt}
        width={insight.image.width}
        height={insight.image.height}
        loading="lazy"
        decoding="async"
      />
      <div>
        <p className="insight__title">{title}</p>
        <p className="insight__name">{insight.image.title}</p>
        <p className="insight__detail">
          {verb} {insight.count} {insight.count === 1 ? 'volta' : 'volte'} su {insight.played}
        </p>
      </div>
    </div>
  );
}

function scoreTone(score, maxScore) {
  if (score === maxScore) return 'gold';
  if (score >= maxScore * 0.6) return 'great';
  if (score > 0) return 'good';
  return 'zero';
}

function GameRow({ game }) {
  return (
    <li className="game-row card">
      <details>
        <summary className="game-row__summary">
          <span className="game-row__date">
            <strong>{formatDate(game.playedAt)}</strong>
            <span>
              {formatTime(game.playedAt)} · {formatRelative(game.playedAt)}
            </span>
          </span>
          <span className="game-row__thumbs" aria-hidden="true">
            {game.rounds.map((round) => (
              <span key={round.position} className={`thumb thumb--${round.isCorrect ? 'ok' : 'ko'}`}>
                <img src={round.image.url} alt="" width={round.image.width} height={round.image.height} loading="lazy" />
                <span className="thumb__badge">
                  <Icon name={round.isCorrect ? 'check' : 'x'} size={12} strokeWidth={3.2} />
                </span>
              </span>
            ))}
          </span>
          <span className={`score-pill score-pill--${scoreTone(game.score, game.maxScore)}`}>
            {game.score}
            <small>/{game.maxScore}</small>
            <span className="visually-hidden"> punti</span>
          </span>
          <Icon name="chevron-down" className="game-row__chevron" />
        </summary>

        <ol className="game-row__rounds">
          {game.rounds.map((round) => (
            <li key={round.position} className={`round-detail round-detail--${round.isCorrect ? 'ok' : 'ko'}`}>
              <MemeCard image={round.image} caption={round.caption?.text} className="round-detail__meme" />
              <div className="round-detail__body">
                <p className="round-detail__meta">
                  <span>Round {round.position}</span>
                  <span className={`chip ${round.isCorrect ? 'chip--green' : round.timedOut ? 'chip--orange' : 'chip--red'}`}>
                    <Icon name={round.isCorrect ? 'check' : round.timedOut ? 'clock' : 'x'} size={14} strokeWidth={3} />
                    {round.isCorrect ? `+${round.points} punti` : round.timedOut ? 'Tempo scaduto' : 'Sbagliata'}
                  </span>
                </p>
                <p className="round-detail__caption">
                  {round.caption ? `«${round.caption.text}»` : 'Nessuna didascalia scelta in tempo.'}
                </p>
                <p className="round-detail__extra">
                  {round.image.title}
                  {round.responseMs !== null && ` · risposta in ${formatSeconds(round.responseMs)}`}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </details>
    </li>
  );
}

function HistorySkeleton() {
  return (
    <div className="history__skeleton" aria-hidden="true">
      <div className="kpis">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="skeleton skeleton--tile" />
        ))}
      </div>
      <div className="skeleton skeleton--chart" />
      {[0, 1, 2].map((i) => (
        <div key={i} className="skeleton skeleton--row" />
      ))}
    </div>
  );
}

export default function HistoryPage() {
  useDocumentTitle('Storico');
  const { user } = useAuth();
  const toast = useToast();
  const [state, setState] = useState({ status: 'loading' });
  const [loadingMore, setLoadingMore] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;
    Promise.all([api.getStats({ signal }), api.getHistory({ limit: PAGE_SIZE, offset: 0, signal })])
      .then(([{ stats }, page]) => setState({ status: 'ready', stats, items: page.items, total: page.total }))
      .catch((error) => {
        if (!isAbortError(error)) setState({ status: 'error', error });
      });
    return () => controller.abort();
  }, [attempt]);

  async function loadMore() {
    setLoadingMore(true);
    try {
      const page = await api.getHistory({ limit: PAGE_SIZE, offset: state.items.length });
      setState((current) => ({ ...current, items: [...current.items, ...page.items], total: page.total }));
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoadingMore(false);
    }
  }

  let body;
  if (state.status === 'loading') body = <HistorySkeleton />;
  else if (state.status === 'error') {
    body = (
      <ErrorState
        message={state.error.message}
        onRetry={() => {
          setState({ status: 'loading' });
          setAttempt((n) => n + 1);
        }}
      />
    );
  } else if (state.stats.gamesPlayed === 0) {
    body = (
      <EmptyState
        icon="sparkles"
        title="Ancora nessuna partita"
        message="La prima è sempre la più divertente: tre meme, trenta secondi ciascuno."
        action={<PlayLink>Gioca la prima partita</PlayLink>}
      />
    );
  } else {
    const { stats, items, total } = state;
    body = (
      <>
        <section className="kpis" aria-label="Statistiche principali">
          <StatTile icon="medal" tone="violet" label="Partite giocate" value={formatInteger(stats.gamesPlayed)} />
          <StatTile
            icon="sparkles"
            tone="yellow"
            label="Punti totali"
            value={formatInteger(stats.totalScore)}
            detail={`Media ${formatDecimal(stats.averageScore)} a partita`}
          />
          <StatTile
            icon="crown"
            tone="pink"
            label="Record"
            value={`${stats.bestScore}/${stats.maxScore}`}
            detail={stats.perfectGames ? `${stats.perfectGames} ${stats.perfectGames === 1 ? 'partita perfetta' : 'partite perfette'}` : 'Punta al 15!'}
          />
          <StatTile
            icon="target"
            tone="cyan"
            label="Precisione"
            value={formatPercent(stats.accuracy)}
            detail={`${stats.correctAnswers} risposte giuste su ${stats.roundsPlayed}`}
          />
        </section>

        <section className="insights">
          <ScoreChart games={stats.recentGames} maxScore={stats.maxScore} />
          <aside className="insights__side card">
            <h2 className="insights__title">Curiosità</h2>
            <MemeInsight title="Il tuo meme preferito" insight={stats.favoriteMeme} verb="Indovinato" />
            <MemeInsight title="La tua nemesi" insight={stats.nemesisMeme} verb="Sbagliato" />
            <dl className="facts">
              <div>
                <dt>
                  <Icon name="flame" size={18} /> Serie migliore
                </dt>
                <dd>
                  {stats.longestStreak} {stats.longestStreak === 1 ? 'risposta giusta' : 'risposte giuste di fila'}
                </dd>
              </div>
              {stats.fastestCorrectMs !== null && (
                <div>
                  <dt>
                    <Icon name="zap" size={18} /> Risposta più veloce
                  </dt>
                  <dd>{formatSeconds(stats.fastestCorrectMs)}</dd>
                </div>
              )}
              {stats.averageCorrectMs !== null && (
                <div>
                  <dt>
                    <Icon name="clock" size={18} /> Tempo medio (risposte giuste)
                  </dt>
                  <dd>{formatSeconds(stats.averageCorrectMs)}</dd>
                </div>
              )}
            </dl>
          </aside>
        </section>

        <section className="games" aria-labelledby="games-title">
          <div className="games__head">
            <h2 id="games-title" className="section-title">
              Tutte le partite
            </h2>
            <span className="chip">{formatInteger(total)}</span>
          </div>
          <ol className="games__list">
            {items.map((game) => (
              <GameRow key={game.id} game={game} />
            ))}
          </ol>
          {items.length < total && (
            <button type="button" className="btn games__more" onClick={loadMore} disabled={loadingMore}>
              {loadingMore ? <Spinner label="Caricamento…" /> : <Icon name="chevron-down" />} Mostra altre partite
            </button>
          )}
        </section>
      </>
    );
  }

  return (
    <div className="container history">
      <header className="page-head">
        <div>
          <p className="page-head__eyebrow">Ciao {user.name} 👋</p>
          <h1 className="page-head__title">Le tue partite</h1>
        </div>
        <PlayLink className="btn btn--primary">Nuova partita</PlayLink>
      </header>
      {body}
    </div>
  );
}
