import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { PlayLink } from '../components/Feedback.jsx';
import { Icon } from '../components/Icon.jsx';
import { MemeCard } from '../components/MemeCard.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useDocumentTitle } from '../hooks/useDocumentTitle.js';
import { api, isAbortError } from '../lib/api.js';
import { formatInteger } from '../lib/format.js';
import './HomePage.css';

// Didascalie inedite, scritte apposta per la vetrina: non svelano le risposte del gioco.
const SHOWCASE = [
  {
    image: { url: '/static/This-Is-Fine.jpg', alt: 'Cane seduto tranquillo in una stanza in fiamme', width: 580, height: 282 },
    caption: 'Quando il codice compila al primo colpo',
  },
  {
    image: { url: '/static/Leonardo-Dicaprio-Cheers.jpg', alt: 'Leonardo DiCaprio che alza un calice', width: 600, height: 400 },
    caption: 'A chi ha appena indovinato il suo primo meme',
  },
  {
    image: { url: '/static/Roll-Safe-Think-About-It.jpg', alt: 'Uomo che si picchietta la tempia con aria furba', width: 702, height: 395 },
    caption: 'Non puoi sbagliare didascalia se le indovini tutte',
  },
];

const STEPS = [
  {
    icon: 'image',
    title: 'Guarda il meme',
    text: 'Ti mostriamo un meme senza testo. Studialo bene: ogni dettaglio conta.',
  },
  {
    icon: 'target',
    title: 'Scegli la didascalia',
    text: 'Sette frasi, solo due giuste. Hai 30 secondi: con i tasti da 1 a 7 vai ancora più veloce.',
  },
  {
    icon: 'sparkles',
    title: 'Fai punti',
    text: '+5 punti per ogni meme indovinato. Alla fine scopri le risposte giuste e il tuo verdetto.',
  },
];

function LeaderboardTeaser() {
  const [players, setPlayers] = useState(null);

  useEffect(() => {
    const controller = new AbortController();
    api
      .getLeaderboard({ signal: controller.signal })
      .then((data) => setPlayers(data.players.slice(0, 3)))
      .catch((error) => {
        if (!isAbortError(error)) setPlayers([]);
      });
    return () => controller.abort();
  }, []);

  if (!players?.length) return null;
  const medals = ['gold', 'silver', 'bronze'];

  return (
    <section className="teaser" aria-labelledby="teaser-title">
      <div className="teaser__head">
        <h2 id="teaser-title" className="section-title">
          Chi comanda la classifica?
        </h2>
        <Link to="/leaderboard" className="btn btn--sm" viewTransition>
          Classifica completa <Icon name="arrow-right" size={18} />
        </Link>
      </div>
      <ol className="teaser__list">
        {players.map((player, index) => (
          <li key={`${player.rank}-${player.name}`} className={`teaser__item teaser__item--${medals[index]}`}>
            <span className="teaser__rank" aria-label={`Posizione ${player.rank}`}>
              {player.rank}
            </span>
            <span className="teaser__name">{player.name}</span>
            <span className="teaser__score">
              <strong>{formatInteger(player.totalScore)}</strong> pt
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}

export default function HomePage() {
  useDocumentTitle(null);
  const { status, user } = useAuth();

  return (
    <div className="container home">
      <section className="hero" aria-labelledby="hero-title">
        <div className="hero__copy">
          <p className="hero__eyebrow chip">
            <Icon name="zap" size={16} /> 30 secondi · 7 didascalie · 2 giuste
          </p>
          <h1 id="hero-title" className="hero__title">
            Dai al meme la <mark>didascalia</mark> che si merita.
          </h1>
          <p className="hero__lead">
            {status === 'authenticated'
              ? `Bentornato, ${user.name}! Tre round, trenta secondi ciascuno: vediamo se batti il tuo record.`
              : 'Ogni round hai un meme, sette frasi e trenta secondi. Solo due sono quelle giuste: trovane una e fai punti.'}
          </p>
          <div className="hero__cta">
            <PlayLink>{status === 'authenticated' ? 'Nuova partita' : 'Gioca ora'}</PlayLink>
            {status === 'authenticated' ? (
              <Link to="/history" className="btn btn--lg" viewTransition>
                <Icon name="history" /> Le mie partite
              </Link>
            ) : (
              <a href="#come-si-gioca" className="btn btn--lg">
                Come si gioca
              </a>
            )}
          </div>
        </div>

        <div className="hero__art" aria-hidden="true">
          {SHOWCASE.map((item, index) => (
            <div key={item.image.url} className={`hero__card hero__card--${index + 1}`}>
              <MemeCard image={item.image} caption={item.caption} priority={index === 0} />
            </div>
          ))}
          <span className="hero__sticker hero__sticker--score">+5</span>
          <span className="hero__sticker hero__sticker--lol">LOL</span>
        </div>
      </section>

      <section id="come-si-gioca" className="steps" aria-labelledby="steps-title">
        <h2 id="steps-title" className="section-title">
          Come si gioca
        </h2>
        <ol className="steps__list">
          {STEPS.map((step, index) => (
            <li key={step.title} className="step card">
              <span className={`step__icon step__icon--${index + 1}`} aria-hidden="true">
                <Icon name={step.icon} size={26} />
              </span>
              <span className="step__number" aria-hidden="true">
                {index + 1}
              </span>
              <h3 className="step__title">{step.title}</h3>
              <p className="step__text">{step.text}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="modes" aria-labelledby="modes-title">
        <h2 id="modes-title" className="section-title">
          Due modi di giocare
        </h2>
        <div className="modes__grid">
          <article className="mode card">
            <h3 className="mode__title">
              <Icon name="zap" /> Partita veloce
            </h3>
            <p className="mode__text">Un round secco, senza registrazione. Perfetto per scoprire il gioco.</p>
            <ul className="mode__list">
              <li>1 round da 30 secondi</li>
              <li>Risposte svelate alla fine</li>
              <li>Nessun dato salvato</li>
            </ul>
          </article>
          <article className="mode mode--featured card">
            <span className="mode__badge sticker">Consigliata</span>
            <h3 className="mode__title">
              <Icon name="crown" /> Partita completa
            </h3>
            <p className="mode__text">Tre round con meme sempre diversi, statistiche e un posto in classifica.</p>
            <ul className="mode__list">
              <li>3 round, fino a 15 punti</li>
              <li>Storico e statistiche personali</li>
              <li>Classifica con gli altri giocatori</li>
            </ul>
            {status === 'guest' && (
              <div className="mode__cta">
                <Link to="/register" className="btn btn--accent" viewTransition>
                  <Icon name="user-plus" /> Crea un account
                </Link>
                <Link to="/login" className="btn btn--ghost" viewTransition>
                  Ho già un account
                </Link>
              </div>
            )}
          </article>
        </div>
      </section>

      <LeaderboardTeaser />
    </div>
  );
}
