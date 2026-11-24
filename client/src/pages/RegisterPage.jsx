import { useState } from 'react';
import { Link, useLocation } from 'react-router';
import { Spinner } from '../components/Feedback.jsx';
import { Icon } from '../components/Icon.jsx';
import { LogoMark } from '../components/Logo.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { useDocumentTitle } from '../hooks/useDocumentTitle.js';
import { PasswordInput } from './auth/PasswordInput.jsx';
import './AuthPages.css';

const USERNAME_PATTERN = /^[a-zA-Z0-9._-]{3,24}$/;
const STRENGTH_LABELS = ['Troppo corta', 'Debole', 'Discreta', 'Buona', 'Ottima'];

/** Stima semplice della robustezza: lunghezza e varietà di caratteri. */
function passwordStrength(password) {
  if (password.length < 8) return 0;
  let score = 1;
  if (password.length >= 12) score += 1;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score += 1;
  if (/\d/.test(password) && /[^a-zA-Z0-9]/.test(password)) score += 1;
  return Math.min(score, 4);
}

function validate(form) {
  const errors = {};
  if (!form.name.trim()) errors.name = 'Scegli il nome da mostrare in classifica.';
  else if (form.name.trim().length > 40) errors.name = 'Il nome può avere al massimo 40 caratteri.';
  if (!USERNAME_PATTERN.test(form.username.trim())) {
    errors.username = 'Da 3 a 24 caratteri: lettere, numeri, punto, trattino e underscore.';
  }
  if (form.password.length < 8) errors.password = 'La password deve avere almeno 8 caratteri.';
  if (form.confirm !== form.password) errors.confirm = 'Le due password non coincidono.';
  return errors;
}

function Field({ id, label, hint, error, children }) {
  return (
    <div className="field">
      <label className="field__label" htmlFor={id}>
        {label}
      </label>
      {children}
      {error ? (
        <p className="field__error" id={`${id}-error`}>
          <Icon name="alert" size={16} /> {error}
        </p>
      ) : (
        hint && (
          <p className="field__hint" id={`${id}-hint`}>
            {hint}
          </p>
        )
      )}
    </div>
  );
}

export default function RegisterPage() {
  useDocumentTitle('Registrati');
  const { register } = useAuth();
  const toast = useToast();
  const location = useLocation();
  const [form, setForm] = useState({ name: '', username: '', password: '', confirm: '' });
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState(false);
  const [pending, setPending] = useState(false);
  const [serverError, setServerError] = useState(null);

  const visibleErrors = touched ? { ...validate(form), ...errors } : errors;
  const strength = passwordStrength(form.password);

  const update = (field) => (event) => {
    setForm((current) => ({ ...current, [field]: event.target.value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  };
  const describe = (id) => (visibleErrors[id] ? `${id}-error` : `${id}-hint`);

  async function handleSubmit(event) {
    event.preventDefault();
    setTouched(true);
    setServerError(null);
    if (Object.keys(validate(form)).length > 0) return;
    setPending(true);
    try {
      const user = await register({ name: form.name.trim(), username: form.username.trim(), password: form.password });
      toast.success(`Benvenuto, ${user.name}! Il tuo account è pronto.`);
    } catch (error) {
      setErrors(error.details ?? {});
      if (!error.details) setServerError(error.message);
      setPending(false);
    }
  }

  return (
    <div className="container auth">
      <section className="auth__card card" aria-labelledby="register-title">
        <div className="auth__head">
          <LogoMark size={56} />
          <h1 id="register-title" className="auth__title">
            Crea il tuo account
          </h1>
          <p className="auth__lead">Partite da tre round, storico, statistiche e classifica. Gratis, in dieci secondi.</p>
        </div>

        <form className="auth__form" noValidate onSubmit={handleSubmit}>
          {serverError && (
            <p className="alert" role="alert">
              <Icon name="alert" /> {serverError}
            </p>
          )}
          <Field id="name" label="Nome visualizzato" hint="Comparirà in classifica." error={visibleErrors.name}>
            <input
              id="name"
              className="input"
              value={form.name}
              onChange={update('name')}
              autoComplete="nickname"
              maxLength={40}
              required
              autoFocus
              aria-invalid={Boolean(visibleErrors.name) || undefined}
              aria-describedby={describe('name')}
            />
          </Field>
          <Field id="username" label="Username" hint="Ti servirà per accedere: 3–24 caratteri." error={visibleErrors.username}>
            <input
              id="username"
              className="input"
              value={form.username}
              onChange={update('username')}
              autoComplete="username"
              autoCapitalize="none"
              spellCheck="false"
              maxLength={24}
              required
              aria-invalid={Boolean(visibleErrors.username) || undefined}
              aria-describedby={describe('username')}
            />
          </Field>
          <Field id="password" label="Password" error={visibleErrors.password}>
            <PasswordInput
              id="password"
              value={form.password}
              onChange={update('password')}
              autoComplete="new-password"
              invalid={Boolean(visibleErrors.password)}
              describedBy={visibleErrors.password ? 'password-error password-strength' : 'password-strength'}
            />
            <div className="strength" data-level={strength} id="password-strength" aria-live="polite">
              <span className="strength__bars" aria-hidden="true">
                {[1, 2, 3, 4].map((level) => (
                  <span key={level} className={level <= strength ? 'is-on' : ''} />
                ))}
              </span>
              <span className="strength__label">
                {form.password ? `Robustezza: ${STRENGTH_LABELS[strength]}` : 'Almeno 8 caratteri: meglio una frase lunga e facile da ricordare.'}
              </span>
            </div>
          </Field>
          <Field id="confirm" label="Conferma password" error={visibleErrors.confirm}>
            <PasswordInput
              id="confirm"
              value={form.confirm}
              onChange={update('confirm')}
              autoComplete="new-password"
              invalid={Boolean(visibleErrors.confirm)}
              describedBy={visibleErrors.confirm ? 'confirm-error' : undefined}
            />
          </Field>
          <button type="submit" className="btn btn--accent btn--lg btn--block" disabled={pending}>
            {pending ? <Spinner label="Creazione dell’account…" /> : <Icon name="user-plus" />} Crea account
          </button>
        </form>

        <p className="auth__switch">
          Hai già un account?{' '}
          <Link to="/login" state={location.state} viewTransition>
            Accedi
          </Link>
        </p>
      </section>
    </div>
  );
}
