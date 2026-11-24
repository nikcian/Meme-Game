import { isRouteErrorResponse, Link, useRouteError } from 'react-router';
import { Icon } from '../Icon.jsx';

/** Errori imprevisti di rendering o di caricamento di una pagina (es. nuovo deploy durante la navigazione). */
export function RouteError() {
  const error = useRouteError();
  const isChunkError = error instanceof TypeError && /dynamically imported module|Importing a module script/i.test(error.message);
  const message = isRouteErrorResponse(error)
    ? `${error.status} ${error.statusText}`
    : isChunkError
      ? "È disponibile una nuova versione dell'app: ricarica la pagina."
      : 'Si è verificato un errore inatteso. Ricaricare la pagina di solito risolve.';

  if (import.meta.env.DEV) console.error(error);

  return (
    <div className="error-screen">
      <div className="state card card--pad" role="alert">
        <span className="state__icon state__icon--danger" aria-hidden="true">
          <Icon name="alert" size={28} />
        </span>
        <h1 className="state__title">Ops, qualcosa si è rotto</h1>
        <p className="state__text">{message}</p>
        <div className="state__actions">
          <button type="button" className="btn btn--primary" onClick={() => window.location.reload()}>
            <Icon name="refresh" /> Ricarica
          </button>
          <Link to="/" className="btn" reloadDocument>
            <Icon name="home" /> Home
          </Link>
        </div>
      </div>
    </div>
  );
}
