const db = require('../database/db');

function createCircuit(name, version_hash, callback) {
  const sql = `INSERT INTO Circuits (name, version_hash) VALUES (?, ?)`;
  db.run(sql, [name, version_hash], function (err) {
    callback(err, this?.lastID);
  });
}

function getCircuitByHash(version_hash, callback) {
  db.get(`SELECT * FROM Circuits WHERE version_hash = ?`, [version_hash], callback);
}

function getLatestCircuitByName(name, callback) {
  db.get(`
    SELECT * FROM Circuits
    WHERE name = ?
    ORDER BY created_at DESC
    LIMIT 1
  `, [name], callback);
}

module.exports = { createCircuit, getCircuitByHash, getLatestCircuitByName };
