import { useState } from 'react';
import { Icon } from '../../components/Icon.jsx';

/** Campo password con pulsante mostra/nascondi. */
export function PasswordInput({ id, value, onChange, autoComplete, invalid = false, describedBy }) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="input-group">
      <input
        id={id}
        className="input"
        type={visible ? 'text' : 'password'}
        value={value}
        onChange={onChange}
        autoComplete={autoComplete}
        autoCapitalize="none"
        spellCheck="false"
        maxLength={128}
        required
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
      />
      <button
        type="button"
        className="input-group__btn icon-btn icon-btn--flat"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? 'Nascondi password' : 'Mostra password'}
        aria-pressed={visible}
      >
        <Icon name={visible ? 'eye-off' : 'eye'} />
      </button>
    </div>
  );
}
