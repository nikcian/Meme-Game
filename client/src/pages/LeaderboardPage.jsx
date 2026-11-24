import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { EmptyState, ErrorState, PlayLink } from '../components/Feedback.jsx';
import { Icon } from '../components/Icon.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useDocumentTitle } from '../hooks/useDocumentTitle.js';
import { api, isAbortError } from '../lib/api.js';
import { avatarColor, formatDecimal, formatInteger, initials } from '../lib/format.js';
import './LeaderboardPage.css';

const MEDALS = { 1: 'gold', 2: 'silver', 3: 'bronze' };

function Podium({ players }) {
  // Ordine visivo classico: 2° a sinistra, 1° al centro, 3° a destra.
  const order = [players[1], players[0], players[2]].filter(Boolean);
  return (
    <ol className="podium" aria-label="Podio">
      {order.map((player) => (
        <li
          key={`${player.rank}-${player.name}`}
          className={`podium__step podium__step--${MEDALS[player.rank] ?? 'bronze'}${player.isCurrentUser ? ' is-me' : ''}`}
        >
          <span className="podium__avatar" style={{ '--avatar': avatarColor(player.name) }} aria-hidden="true">
            {initials(player.name)}
          </span>
          <span className="podium__name">
            {player.name}
            {player.isCurrentUser && <span className="podium__you">tu</span>}
          </span>
          <span className="podium__score">
            {formatInteger(player.totalScore)} <small>pt</small>
          </span>
          <span className="podium__block">
            <Icon name={player.rank === 1 ? 'crown' : 'medal'} size={22} />
            <span className="podium__rank">{player.rank}°</span>
          </span>
        </li>
      ))}
    </ol>
  );
}

function PlayerRow({ player }) {
  return (
    <tr className={player.isCurrentUser ? 'is-me' : undefined}>
      <td className="num">{player.rank}</td>
      <th scope="row">
        <span className="player">
          <span className="avatar avatar--sm" style={{ '--avatar': avatarColor(player.name) }} aria-hidden="true">
            {initials(player.name)}
          </span>
          {player.name}
          {player.isCurrentUser && <span className="chip chip--violet">tu</span>}
        </span>
      </th>
      <td className="num">{formatInteger(player.gamesPlayed)}</td>
      <td className="num">{formatDecimal(player.averageScore)}</td>
      <td className="num">{player.bestScore}</td>
      <td className="num num--strong">{formatInteger(player.totalScore)}</td>
    </tr>
  );
}

export default function LeaderboardPage() {
  useDocumentTitle('Classifica');
  const { status } = useAuth();
  const [state, setState] = useState({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    api
      .getLeaderboard({ signal: controller.signal })
      .then((data) => setState({ status: 'ready', ...data }))
      .catch((error) => {
        if (!isAbortError(error)) setState({ status: 'error', error });
      });
    return () => controller.abort();
  }, [attempt, status]);

  let body;
  if (state.status === 'loading') {
    body = (
      <div aria-hidden="true">
        <div className="skeleton skeleton--podium" />
        <div className="skeleton skeleton--table" />
      </div>
    );
  } else if (state.status === 'error') {
    body = (
      <ErrorState
        message={state.error.message}
        onRetry={() => {
          setState({ status: 'loading' });
          setAttempt((n) => n + 1);
        }}
      />
    );
  } else if (state.players.length === 0) {
    body = (
      <EmptyState
        icon="trophy"
        title="La classifica è ancora vuota"
        message="Chi gioca la prima partita completa si prende il primo posto."
        action={<PlayLink>Gioca ora</PlayLink>}
      />
    );
  } else {
    const { players, currentUser, totalPlayers } = state;
    const meOutside = currentUser && !players.some((p) => p.isCurrentUser);
    body = (
      <>
        <Podium players={players.slice(0, 3)} />
        <div className="table-card card">
          <table className="ranking">
            <caption className="visually-hidden">Classifica per punti totali</caption>
            <thead>
              <tr>
                <th scope="col" className="num">
                  #
                </th>
                <th scope="col">Giocatore</th>
                <th scope="col" className="num">
                  Partite
                </th>
                <th scope="col" className="num">
                  Media
                </th>
                <th scope="col" className="num">
                  Record
                </th>
                <th scope="col" className="num">
                  Punti
                </th>
              </tr>
            </thead>
            <tbody>
              {players.map((player) => (
                <PlayerRow key={`${player.rank}-${player.name}`} player={player} />
              ))}
              {meOutside && (
                <>
                  <tr className="ranking__gap" aria-hidden="true">
                    <td colSpan={6}>⋯</td>
                  </tr>
                  <PlayerRow player={currentUser} />
                </>
              )}
            </tbody>
          </table>
          <p className="table-card__foot">
            {formatInteger(totalPlayers)} {totalPlayers === 1 ? 'giocatore' : 'giocatori'} in classifica · a parità di punti
            vince la media più alta
          </p>
        </div>
        {status === 'guest' && (
          <aside className="upsell card">
            <div>
              <h2 className="upsell__title">Vuoi il tuo nome qui?</h2>
              <p>Crea un account gratuito: ogni partita completa porta punti in classifica.</p>
            </div>
            <div className="upsell__actions">
              <Link to="/register" className="btn btn--accent" viewTransition>
                <Icon name="user-plus" /> Registrati
              </Link>
              <Link to="/login" className="btn btn--ghost" viewTransition>
                Accedi
              </Link>
            </div>
          </aside>
        )}
      </>
    );
  }

  return (
    <div className="container leaderboard">
      <header className="page-head">
        <div>
          <p className="page-head__eyebrow">
            <Icon name="trophy" size={18} /> Hall of fame
          </p>
          <h1 className="page-head__title">Classifica</h1>
          <p className="page-head__lead">I giocatori con più punti di sempre, partita dopo partita.</p>
        </div>
        <PlayLink className="btn btn--primary">Gioca</PlayLink>
      </header>
      {body}
    </div>
  );
}
