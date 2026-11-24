import { createContext, use, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { api, isAbortError, onUnauthorized } from '../lib/api.js';
import { useToast } from './ToastContext.jsx';

const AuthContext = createContext(null);

/** Stato di autenticazione: 'loading' finché il server non ha risposto, poi 'authenticated' o 'guest'. */
export function AuthProvider({ children }) {
  const [state, setState] = useState({ status: 'loading', user: null });
  const statusRef = useRef(state.status);
  const toast = useToast();

  useEffect(() => {
    statusRef.current = state.status;
  }, [state.status]);

  useEffect(() => {
    const controller = new AbortController();
    api
      .getSession({ signal: controller.signal })
      .then(({ user }) => setState({ status: user ? 'authenticated' : 'guest', user }))
      .catch((error) => {
        if (!isAbortError(error)) setState({ status: 'guest', user: null });
      });
    return () => controller.abort();
  }, []);

  // Se il server risponde 401 mentre risultiamo collegati, la sessione è scaduta.
  useEffect(
    () =>
      onUnauthorized(() => {
        if (statusRef.current !== 'authenticated') return;
        setState({ status: 'guest', user: null });
        toast.info('La sessione è scaduta: accedi di nuovo per continuare.');
      }),
    [toast],
  );

  const login = useCallback(async (credentials) => {
    const { user } = await api.login(credentials);
    setState({ status: 'authenticated', user });
    return user;
  }, []);

  const register = useCallback(async (account) => {
    const { user } = await api.register(account);
    setState({ status: 'authenticated', user });
    return user;
  }, []);

  const logout = useCallback(async () => {
    await api.logout();
    setState({ status: 'guest', user: null });
  }, []);

  const value = useMemo(() => ({ ...state, login, register, logout }), [state, login, register, logout]);
  return <AuthContext value={value}>{children}</AuthContext>;
}

export function useAuth() {
  const context = use(AuthContext);
  if (!context) throw new Error('useAuth deve essere usato dentro <AuthProvider>.');
  return context;
}
