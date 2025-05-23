import sqlite from 'sqlite3';

//open database
export const db = new sqlite.Database('./db/memeGame.db', (err) => {
    if (err) throw err;
});