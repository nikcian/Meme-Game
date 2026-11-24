// Avvia API (Express) e client (Vite) insieme, con output prefissato e colorato.
// Ctrl+C (o un SIGTERM) li ferma entrambi, figli compresi. Nessuna dipendenza esterna.
import { spawn } from 'node:child_process';

const isWindows = process.platform === 'win32';
const npm = isWindows ? 'npm.cmd' : 'npm';
const useColor = process.stdout.isTTY;
const paint = (code, text) => (useColor ? `\x1b[${code}m${text}\x1b[0m` : text);

const tasks = [
  { name: 'api', color: 35, args: ['run', 'dev', '--workspace', 'server'] },
  { name: 'web', color: 36, args: ['run', 'dev', '--workspace', 'client'] },
];

let stopping = false;

const children = tasks.map(({ name, color, args }) => {
  const child = spawn(npm, args, {
    // stdin ignorato: i figli girano in un proprio gruppo di processi e non devono leggere dal terminale.
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, FORCE_COLOR: useColor ? '1' : '0' },
    shell: isWindows,
    // Su POSIX ogni task ha il suo gruppo: allo stop si termina l'intero albero (npm → sh → node).
    detached: !isWindows,
  });
  const prefix = paint(color, `[${name}]`);
  const relay = (stream, target) => {
    let buffer = '';
    stream.on('data', (chunk) => {
      buffer += chunk;
      const lines = buffer.split('\n');
      buffer = lines.pop();
      for (const line of lines) target.write(`${prefix} ${line}\n`);
    });
  };
  relay(child.stdout, process.stdout);
  relay(child.stderr, process.stderr);
  child.on('exit', (code, signal) => {
    if (stopping) return;
    console.error(`${prefix} terminato (${signal ?? `codice ${code}`}): chiudo anche l'altro processo.`);
    stop(code || 1);
  });
  return child;
});

function terminate(child) {
  if (child.exitCode !== null || child.signalCode !== null) return;
  try {
    if (isWindows) spawn('taskkill', ['/pid', String(child.pid), '/T', '/F'], { stdio: 'ignore' });
    else process.kill(-child.pid, 'SIGTERM');
  } catch {
    // Processo già terminato.
  }
}

function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  children.forEach(terminate);
  setTimeout(() => process.exit(code), 800).unref();
}

process.on('SIGINT', () => stop(0));
process.on('SIGTERM', () => stop(0));
process.on('SIGHUP', () => stop(0));
