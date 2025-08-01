const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const db = new sqlite3.Database(path.join(__dirname, 'cirmetrics.db'));

db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS Circuits (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT,
      version_hash TEXT UNIQUE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS CompileResults (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      circuit_id INTEGER,
      opt_level TEXT,
      constraint_total INTEGER,
      constraint_linear INTEGER,
      constraint_non_linear INTEGER,
      compile_time INTEGER,
      proving_time INTEGER,
      recorded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (circuit_id) REFERENCES Circuits(id)
    )
  `);
});

module.exports = db;
