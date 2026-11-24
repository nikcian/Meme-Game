import { createContext, use, useCallback, useMemo, useState } from 'react';
import { Icon } from '../components/Icon.jsx';

const ToastContext = createContext(null);

const ICONS = { success: 'check', error: 'alert', info: 'info' };
let nextId = 1;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const dismiss = useCallback((id) => setToasts((list) => list.filter((toast) => toast.id !== id)), []);

  const show = useCallback(
    (message, { tone = 'info', duration = 4500 } = {}) => {
      const id = nextId++;
      setToasts((list) => [...list.slice(-2), { id, message, tone }]);
      if (duration > 0) setTimeout(() => dismiss(id), duration);
      return id;
    },
    [dismiss],
  );

  const api = useMemo(
    () => ({
      show,
      dismiss,
      success: (message, options) => show(message, { ...options, tone: 'success' }),
      error: (message, options) => show(message, { ...options, tone: 'error', duration: 6000 }),
      info: (message, options) => show(message, { ...options, tone: 'info' }),
    }),
    [show, dismiss],
  );

  return (
    <ToastContext value={api}>
      {children}
      <section className="toasts" aria-label="Notifiche" aria-live="polite">
        {toasts.map((toast) => (
          <div key={toast.id} className={`toast toast--${toast.tone}`} role={toast.tone === 'error' ? 'alert' : 'status'}>
            <span className="toast__icon" aria-hidden="true">
              <Icon name={ICONS[toast.tone]} size={16} />
            </span>
            <p className="toast__message">{toast.message}</p>
            <button type="button" className="toast__close" onClick={() => dismiss(toast.id)} aria-label="Chiudi notifica">
              <Icon name="x" size={16} />
            </button>
          </div>
        ))}
      </section>
    </ToastContext>
  );
}

export function useToast() {
  const context = use(ToastContext);
  if (!context) throw new Error('useToast deve essere usato dentro <ToastProvider>.');
  return context;
}
