import { Link } from 'react-router';
import { Icon } from './Icon.jsx';

export function Spinner({ label = 'Caricamento…', size = 'md' }) {
  return (
    <span className={`spinner spinner--${size}`} role="status">
      <span className="visually-hidden">{label}</span>
    </span>
  );
}

export function PageLoader({ label = 'Caricamento…' }) {
  return (
    <div className="page-loader">
      <Spinner label={label} size="lg" />
    </div>
  );
}

/** Messaggio d'errore con possibilità di riprovare. */
export function ErrorState({ title = 'Qualcosa è andato storto', message, onRetry }) {
  return (
    <div className="state card card--pad" role="alert">
      <span className="state__icon state__icon--danger" aria-hidden="true">
        <Icon name="alert" size={28} />
      </span>
      <h2 className="state__title">{title}</h2>
      {message && <p className="state__text">{message}</p>}
      {onRetry && (
        <button type="button" className="btn btn--primary" onClick={onRetry}>
          <Icon name="refresh" /> Riprova
        </button>
      )}
    </div>
  );
}

export function EmptyState({ icon = 'sparkles', title, message, action }) {
  return (
    <div className="state card card--pad">
      <span className="state__icon" aria-hidden="true">
        <Icon name={icon} size={28} />
      </span>
      <h2 className="state__title">{title}</h2>
      {message && <p className="state__text">{message}</p>}
      {action}
    </div>
  );
}

export function PlayLink({ children = 'Gioca ora', className = 'btn btn--primary btn--lg', icon = 'play' }) {
  return (
    <Link to="/play" className={className} viewTransition>
      <Icon name={icon} /> {children}
    </Link>
  );
}
