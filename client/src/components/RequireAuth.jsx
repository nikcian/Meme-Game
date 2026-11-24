import { Navigate, useLocation } from 'react-router';
import { useAuth } from '../context/AuthContext.jsx';
import { PageLoader } from './Feedback.jsx';

/** Protegge una pagina: se non si è autenticati, rimanda al login e poi di nuovo qui. */
export function RequireAuth({ children }) {
  const { status } = useAuth();
  const location = useLocation();
  if (status === 'loading') return <PageLoader />;
  if (status !== 'authenticated') return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  return children;
}

/** Pagine riservate agli ospiti (login, registrazione): chi è già collegato torna dove stava andando. */
export function GuestOnly({ children }) {
  const { status } = useAuth();
  const location = useLocation();
  if (status === 'loading') return <PageLoader />;
  if (status === 'authenticated') return <Navigate to={location.state?.from ?? '/'} replace />;
  return children;
}
