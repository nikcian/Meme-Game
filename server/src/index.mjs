import { createApp } from './app.mjs';
import { loadConfig } from './config.mjs';
import { openDatabase } from './db/database.mjs';

let config;
try {
  config = loadConfig();
} catch (error) {
  console.error(`\n✖ Configurazione non valida: ${error.message}\n`);
  process.exit(1);
}

const db = await openDatabase(config.dbPath, { seedDemo: config.seedDemoData });
const { app, close } = createApp({ config, db });

const server = app.listen(config.port, config.host);

server.once('listening', () => {
  const url = `http://${config.host === '0.0.0.0' ? 'localhost' : config.host}:${config.port}`;
  console.info(`\n🎭 Meme Game ${config.isProduction ? '(produzione)' : '(sviluppo)'}`);
  console.info(`   API      → ${url}/api`);
  if (config.serveClient) console.info(`   App      → ${url}`);
  console.info(`   Database → ${config.dbPath}\n`);
});

server.on('error', (error) => {
  console.error(
    error.code === 'EADDRINUSE'
      ? `\n✖ La porta ${config.port} è già in uso: chiudi l'altro processo o imposta PORT.\n`
      : error,
  );
  process.exit(1);
});

let stopping = false;
function shutdown(signal) {
  if (stopping) return;
  stopping = true;
  console.info(`\n${signal} ricevuto: chiusura in corso…`);
  server.close(() => {
    close();
    db.close();
    process.exit(0);
  });
  server.closeIdleConnections();
  setTimeout(() => process.exit(1), 5_000).unref();
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
