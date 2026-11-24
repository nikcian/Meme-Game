import { useRef } from 'react';
import { Link, NavLink, useNavigate } from 'react-router';
import { useAuth } from '../../context/AuthContext.jsx';
import { usePreferences } from '../../context/PreferencesContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { avatarColor, initials } from '../../lib/format.js';
import { Icon } from '../Icon.jsx';
import { Logo } from '../Logo.jsx';

function PreferenceToggles() {
  const { theme, toggleTheme, soundOn, toggleSound } = usePreferences();
  return (
    <>
      <button
        type="button"
        className="icon-btn"
        onClick={toggleTheme}
        aria-label={theme === 'dark' ? 'Passa al tema chiaro' : 'Passa al tema scuro'}
        title={theme === 'dark' ? 'Tema chiaro' : 'Tema scuro'}
      >
        <Icon name={theme === 'dark' ? 'sun' : 'moon'} />
      </button>
      <button
        type="button"
        className="icon-btn"
        onClick={toggleSound}
        aria-pressed={soundOn}
        aria-label="Effetti sonori"
        title={soundOn ? 'Disattiva i suoni' : 'Attiva i suoni'}
      >
        <Icon name={soundOn ? 'volume' : 'volume-off'} />
      </button>
    </>
  );
}

function UserMenu({ user }) {
  const { logout } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const menuRef = useRef(null);

  const close = () => menuRef.current?.hidePopover?.();

  async function handleLogout() {
    close();
    try {
      await logout();
      toast.success('Alla prossima partita! 👋');
      navigate('/', { viewTransition: true });
    } catch (error) {
      toast.error(error.message);
    }
  }

  return (
    <>
      <button type="button" className="user-btn" popoverTarget="user-menu" aria-label={`Menu account di ${user.name}`}>
        <span className="avatar" style={{ '--avatar': avatarColor(user.name) }} aria-hidden="true">
          {initials(user.name)}
        </span>
        <span className="user-btn__name">{user.name}</span>
        <Icon name="chevron-down" size={16} />
      </button>
      <div id="user-menu" ref={menuRef} popover="auto" className="menu">
        <div className="menu__head">
          <span className="avatar avatar--lg" style={{ '--avatar': avatarColor(user.name) }} aria-hidden="true">
            {initials(user.name)}
          </span>
          <span>
            <strong>{user.name}</strong>
            <span className="menu__sub">@{user.username}</span>
          </span>
        </div>
        <Link to="/history" className="menu__item" onClick={close} viewTransition>
          <Icon name="history" /> Le mie partite
        </Link>
        <Link to="/leaderboard" className="menu__item" onClick={close} viewTransition>
          <Icon name="trophy" /> Classifica
        </Link>
        <button type="button" className="menu__item menu__item--danger" onClick={handleLogout}>
          <Icon name="logout" /> Esci
        </button>
      </div>
    </>
  );
}

const navClass = ({ isActive }) => `nav__link${isActive ? ' is-active' : ''}`;

export function Header() {
  const { status, user } = useAuth();

  return (
    <header className="header">
      <div className="container header__inner">
        <Link to="/" className="header__brand" aria-label="Meme Game, vai alla home" viewTransition>
          <Logo />
        </Link>

        <nav className="nav" aria-label="Navigazione principale">
          <NavLink to="/play" className={navClass} viewTransition>
            Gioca
          </NavLink>
          <NavLink to="/leaderboard" className={navClass} viewTransition>
            Classifica
          </NavLink>
          {status === 'authenticated' && (
            <NavLink to="/history" className={navClass} viewTransition>
              Storico
            </NavLink>
          )}
        </nav>

        <div className="header__actions">
          <PreferenceToggles />
          {status === 'authenticated' && <UserMenu user={user} />}
          {status === 'guest' && (
            <Link to="/login" className="btn btn--sm btn--primary" viewTransition>
              <Icon name="login" size={18} /> Accedi
            </Link>
          )}
          {status === 'loading' && <span className="user-btn user-btn--skeleton skeleton" aria-hidden="true" />}
        </div>
      </div>
    </header>
  );
}
