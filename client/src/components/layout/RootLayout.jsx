import { NavLink, Outlet, ScrollRestoration, useLocation, useNavigation } from 'react-router';
import { useAuth } from '../../context/AuthContext.jsx';
import { Icon } from '../Icon.jsx';
import { Header } from './Header.jsx';

function TabBar() {
  const { status } = useAuth();
  const tabClass = ({ isActive }) => `tabbar__link${isActive ? ' is-active' : ''}`;
  return (
    <nav className="tabbar" aria-label="Navigazione rapida">
      <NavLink to="/" end className={tabClass} viewTransition>
        <Icon name="home" /> Home
      </NavLink>
      <NavLink to="/play" className={tabClass} viewTransition>
        <Icon name="play" /> Gioca
      </NavLink>
      <NavLink to="/leaderboard" className={tabClass} viewTransition>
        <Icon name="trophy" /> Classifica
      </NavLink>
      {status === 'authenticated' ? (
        <NavLink to="/history" className={tabClass} viewTransition>
          <Icon name="history" /> Storico
        </NavLink>
      ) : (
        <NavLink to="/login" className={tabClass} viewTransition>
          <Icon name="login" /> Accedi
        </NavLink>
      )}
    </nav>
  );
}

function Footer() {
  return (
    <footer className="footer">
      <div className="container footer__inner">
        <p>
          <strong>Meme Game</strong> · un meme, sette didascalie, trenta secondi.
        </p>
        <p className="footer__muted">
          Le immagini dei meme appartengono ai rispettivi autori e sono usate a scopo ludico.{' '}
          <a href="https://github.com/nikcian/Meme-Game" target="_blank" rel="noreferrer noopener">
            Codice sorgente
          </a>
        </p>
      </div>
    </footer>
  );
}

export function RootLayout() {
  const navigation = useNavigation();
  const { pathname } = useLocation();
  const inGame = pathname === '/play';

  return (
    <div className={`app${inGame ? ' app--game' : ''}`}>
      <a href="#main" className="skip-link">
        Vai al contenuto
      </a>
      {navigation.state !== 'idle' && <div className="route-progress" role="progressbar" aria-label="Caricamento pagina" />}
      <Header />
      <main id="main" className="app__main" tabIndex={-1}>
        <Outlet />
      </main>
      {!inGame && <Footer />}
      {!inGame && <TabBar />}
      <ScrollRestoration />
    </div>
  );
}

/** Schermata mostrata mentre si carica il codice della prima pagina. */
export function AppSplash() {
  return (
    <div className="splash" role="status">
      <span className="spinner spinner--lg" />
      <span className="visually-hidden">Caricamento di Meme Game…</span>
    </div>
  );
}
