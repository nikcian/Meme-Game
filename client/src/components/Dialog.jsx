import { useEffect, useId, useRef } from 'react';

/**
 * Finestra modale basata su <dialog> nativo: focus intrappolato, Esc e top layer gestiti dal browser.
 * @param {{ open: boolean, onClose: () => void, title: string, children?: import('react').ReactNode, actions: import('react').ReactNode, icon?: import('react').ReactNode }} props
 */
export function Dialog({ open, onClose, title, children, actions, icon }) {
  const ref = useRef(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      className="dialog"
      aria-labelledby={titleId}
      onClose={onClose}
      onClick={(event) => {
        // Click sullo sfondo (fuori dal contenuto): chiude.
        if (event.target === ref.current) onClose();
      }}
    >
      <div className="dialog__content">
        {icon && <div className="dialog__icon">{icon}</div>}
        <h2 id={titleId} className="dialog__title">
          {title}
        </h2>
        {children && <div className="dialog__body">{children}</div>}
        <div className="dialog__actions">{actions}</div>
      </div>
    </dialog>
  );
}
