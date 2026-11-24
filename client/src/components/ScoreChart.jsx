import { useId, useState } from 'react';
import { formatDate, formatTime } from '../lib/format.js';

/**
 * Colonne dei punti delle ultime partite (una serie: niente legenda, il titolo la nomina).
 * Ogni colonna è focusabile e mostra il dettaglio su hover/focus; una tabella nascosta
 * offre gli stessi valori ai lettori di schermo.
 *
 * @param {{ games: { id: number, playedAt: string, score: number }[], maxScore: number }} props
 */
export function ScoreChart({ games, maxScore }) {
  const [active, setActive] = useState(null);
  const tableId = useId();
  const ticks = Array.from({ length: Math.round(maxScore / 5) + 1 }, (_, i) => i * 5).reverse();
  const activeGame = active === null ? null : games[active];

  return (
    <figure className="chart card">
      <figcaption className="chart__head">
        <h2 className="chart__title">Andamento</h2>
        <p className="chart__subtitle">
          Punti nelle ultime {games.length} {games.length === 1 ? 'partita' : 'partite'}, dalla meno recente
        </p>
      </figcaption>

      <div className="chart__plot" onPointerLeave={() => setActive(null)}>
        <div className="chart__grid" aria-hidden="true">
          {ticks.map((tick) => (
            <div key={tick} className="chart__gridline" style={{ '--y': tick / maxScore }}>
              <span className="chart__tick">{tick}</span>
            </div>
          ))}
        </div>

        <ol className="chart__bars" aria-describedby={tableId} style={{ '--n': games.length }}>
          {games.map((game, index) => (
            <li key={game.id} className="chart__slot">
              <button
                type="button"
                className={`chart__hit${active === index ? ' is-active' : ''}`}
                aria-label={`${formatDate(game.playedAt)}: ${game.score} punti su ${maxScore}`}
                onPointerEnter={() => setActive(index)}
                onFocus={() => setActive(index)}
                onBlur={() => setActive(null)}
              >
                <span className="chart__bar" style={{ '--h': game.score / maxScore }} />
              </button>
            </li>
          ))}
        </ol>

        {activeGame && (
          <div className="chart__tooltip" role="presentation" style={{ '--i': active, '--n': games.length }}>
            <strong>{activeGame.score} punti</strong>
            <span>
              {formatDate(activeGame.playedAt)} · {formatTime(activeGame.playedAt)}
            </span>
          </div>
        )}
      </div>

      <table className="visually-hidden" id={tableId}>
        <caption>Punti per partita</caption>
        <thead>
          <tr>
            <th scope="col">Data</th>
            <th scope="col">Punti</th>
          </tr>
        </thead>
        <tbody>
          {games.map((game) => (
            <tr key={game.id}>
              <td>{formatDate(game.playedAt)}</td>
              <td>{game.score}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
