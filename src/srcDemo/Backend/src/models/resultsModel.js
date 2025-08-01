const db = require('../database/db');

function insertCompileResult(data, callback) {
  const sql = `
    INSERT INTO CompileResults
    (circuit_id, opt_level, constraint_total, constraint_linear, constraint_non_linear, compile_time, proving_time)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `;
  db.run(sql, [
    data.circuit_id, data.opt_level,
    data.constraint_total, data.constraint_linear, data.constraint_non_linear,
    data.compile_time, data.proving_time
  ], function (err) {
    callback(err, this?.lastID);
  });
}

function getResultsByCircuitId(circuit_id, callback) {
  db.all(`
    SELECT * FROM CompileResults
    WHERE circuit_id = ?
    ORDER BY recorded_at DESC
  `, [circuit_id], callback);
}

module.exports = { insertCompileResult, getResultsByCircuitId };
