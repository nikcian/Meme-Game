import { Link } from 'react-router';
import { Icon } from '../components/Icon.jsx';
import { MemeCard } from '../components/MemeCard.jsx';
import { useDocumentTitle } from '../hooks/useDocumentTitle.js';

const FIRE = {
  url: '/static/This-Is-Fine.jpg',
  alt: 'Cane seduto tranquillo in una stanza in fiamme',
  width: 580,
  height: 282,
};

export default function NotFoundPage() {
  useDocumentTitle('Pagina non trovata');
  return (
    <div className="container not-found">
      <MemeCard image={FIRE} caption="404 · va tutto bene" priority className="not-found__meme" />
      <h1 className="not-found__title">Questa pagina non esiste</h1>
      <p className="not-found__text">Forse è andata a fuoco, forse non è mai esistita. In ogni caso: va tutto bene.</p>
      <div className="not-found__actions">
        <Link to="/" className="btn btn--primary btn--lg" viewTransition>
          <Icon name="home" /> Torna alla home
        </Link>
        <Link to="/play" className="btn btn--lg" viewTransition>
          <Icon name="play" /> Gioca
        </Link>
      </div>
    </div>
  );
}
