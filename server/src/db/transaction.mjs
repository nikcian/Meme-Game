/**
 * Esegue `work` in una transazione: commit se termina, rollback se lancia.
 * Con `node:sqlite` le query sono sincrone, quindi nessun'altra richiesta può
 * inserirsi tra BEGIN e COMMIT.
 * @template T
 * @param {import('node:sqlite').DatabaseSync} db
 * @param {() => T} work
 * @returns {T}
 */
export function transaction(db, work) {
  db.exec('BEGIN IMMEDIATE');
  try {
    const result = work();
    db.exec('COMMIT');
    return result;
  } catch (error) {
    try {
      db.exec('ROLLBACK');
    } catch {
      // Nessuna transazione attiva (es. COMMIT fallito dopo un rollback automatico).
    }
    throw error;
  }
}
