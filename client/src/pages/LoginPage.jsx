import { useState } from 'react';
import { Link, useLocation } from 'react-router';
import { Icon } from '../components/Icon.jsx';
import { LogoMark } from '../components/Logo.jsx';
import { Spinner } from '../components/Feedback.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { useDocumentTitle } from '../hooks/useDocumentTitle.js';
import { PasswordInput } from './auth/PasswordInput.jsx';
import './AuthPages.css';

const DEMO = { username: 'user', password: 'testpass' };

export default function LoginPage() {
  useDocumentTitle('Accedi');
  const { login } = useAuth();
  const toast = useToast();
  const location = useLocation();
  const [form, setForm] = useState({ username: '', password: '' });
  const [error, setError] = useState(null);
  const [pending, setPending] = useState(false);

  const update = (field) => (event) => setForm((current) => ({ ...current, [field]: event.target.value }));

  async function submit(credentials) {
    setPending(true);
    setError(null);
    try {
      const user = await login(credentials);
      toast.success(`Ciao ${user.name}, buon divertimento!`);
      // Il reindirizzamento lo gestisce <GuestOnly> appena lo stato diventa "authenticated".
    } catch (err) {
      setError(err.message);
      setPending(false);
    }
  }

  return (
    <div className="container auth">
      <section className="auth__card card" aria-labelledby="login-title">
        <div className="auth__head">
          <LogoMark size={56} />
          <h1 id="login-title" className="auth__title">
            Bentornato!
          </h1>
          <p className="auth__lead">Accedi per giocare partite complete, salvare i risultati e scalare la classifica.</p>
        </div>

        <form
          className="auth__form"
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            if (!form.username.trim() || !form.password) {
              setError('Inserisci username e password.');
              return;
            }
            submit(form);
          }}
        >
          {error && (
            <p className="alert" role="alert">
              <Icon name="alert" /> {error}
            </p>
          )}
          <div className="field">
            <label className="field__label" htmlFor="username">
              Username
            </label>
            <input
              id="username"
              className="input"
              value={form.username}
              onChange={update('username')}
              autoComplete="username"
              autoCapitalize="none"
              spellCheck="false"
              maxLength={64}
              required
              autoFocus
            />
          </div>
          <div className="field">
            <label className="field__label" htmlFor="password">
              Password
            </label>
            <PasswordInput id="password" value={form.password} onChange={update('password')} autoComplete="current-password" />
          </div>
          <button type="submit" className="btn btn--primary btn--lg btn--block" disabled={pending}>
            {pending ? <Spinner label="Accesso in corso…" /> : <Icon name="login" />} Accedi
          </button>
        </form>

        <aside className="auth__demo">
          <p>
            <Icon name="sparkles" size={18} />
            <span>
              Vuoi solo provare? Usa l’account demo <strong>{DEMO.username}</strong> / <strong>{DEMO.password}</strong>.
            </span>
          </p>
          <button
            type="button"
            className="btn btn--sm"
            disabled={pending}
            onClick={() => {
              setForm(DEMO);
              submit(DEMO);
            }}
          >
            Entra con l’account demo
          </button>
        </aside>

        <p className="auth__switch">
          Non hai un account?{' '}
          <Link to="/register" state={location.state} viewTransition>
            Registrati gratis
          </Link>
        </p>
      </section>
    </div>
  );
}
