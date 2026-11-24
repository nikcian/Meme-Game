import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// In sviluppo Vite inoltra /api e /static al server Express: il browser vede un solo
// origin, quindi niente CORS e cookie di sessione SameSite=Strict funzionanti.
const target = process.env.API_TARGET ?? 'http://localhost:3001';
const proxy = {
  '/api': { target },
  '/static': { target },
};

export default defineConfig({
  plugins: [react()],
  server: { port: 5173, strictPort: true, proxy },
  preview: { port: 4173, strictPort: true, proxy },
  build: {
    target: 'es2022',
    // Nessun asset inline come data: URI, per rispettare la Content-Security-Policy del server.
    assetsInlineLimit: 0,
  },
});
