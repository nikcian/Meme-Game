import { useEffect } from 'react';

const APP_NAME = 'Meme Game';

/** Aggiorna il titolo della scheda del browser. */
export function useDocumentTitle(title) {
  useEffect(() => {
    document.title = title ? `${title} · ${APP_NAME}` : `${APP_NAME} — abbina la didascalia giusta`;
  }, [title]);
}
