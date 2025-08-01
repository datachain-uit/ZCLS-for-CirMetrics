const { exec } = require('child_process');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');
const circuitsModel = require('../models/circuitsModel');
const resultsModel = require('../models/resultsModel');
const db = require('../database/db');

function hashContent(content) {
  return crypto.createHash('sha256').update(content).digest('hex');
}

async function compileAndSave(req, res) {
  try {
    const { circuitCode, inputJson, opt_level, name } = req.body;
    console.log(`DEBUG: Received opt_level = ${opt_level}`);
    
    const version_hash = hashContent(circuitCode);
    const inputHash = hashContent(inputJson);

    const circuitPath = path.join(__dirname, `../circuits/${name}-${version_hash}.circom`);
    const inputPath = path.join(__dirname, `../inputs/${name}-${inputHash}.json`);
    const outputDir = path.join(__dirname, `../outputs/${version_hash}`);
    const scriptPath = path.join(__dirname, '../scripts/snark2.sh');

    fs.mkdirSync(outputDir, { recursive: true });
    fs.writeFileSync(circuitPath, circuitCode);
    fs.writeFileSync(inputPath, inputJson);

    const circuit = await upsertCircuit(name, version_hash);

    const cmd = `"${scriptPath}" "${circuitPath}" ${version_hash} ${opt_level}`;
    console.log(`DEBUG: Executing command: ${cmd}`);
    await execPromise(cmd);

    const log = fs.readFileSync(path.join(outputDir, 'compile.log')).toString();
    console.log('DEBUG: Compile log content:');
    console.log(log);
    
    // Clean ANSI escape codes before parsing
    const cleanedLog = log.replace(/\x1b\[[0-9;]*m/g, '');
    console.log('DEBUG: Cleaned log content:');
    console.log(cleanedLog);
    
    const compileTime = extractNumber(cleanedLog, /Compile time \(ms\): (\d+)/);
    
    // More specific regex to avoid matching wrong lines
    const linearMatch = cleanedLog.match(/^linear constraints:\s+(\d+)$/m);
    const nonlinearMatch = cleanedLog.match(/^non-linear constraints:\s+(\d+)$/m);
    
    const linear = linearMatch ? parseInt(linearMatch[1]) : 0;
    const nonlinear = nonlinearMatch ? parseInt(nonlinearMatch[1]) : 0;
    const constraint_total = linear + nonlinear;
    
    console.log(`DEBUG: Linear match: ${linearMatch}, Non-linear match: ${nonlinearMatch}`);
    console.log(`DEBUG: Parsed values - linear: ${linear}, nonlinear: ${nonlinear}, total: ${constraint_total}`);

    const compileResult = {
      circuit_id: circuit.id,
      version_hash: version_hash,
      opt_level,
      constraint_total,
      constraint_linear: linear,
      constraint_non_linear: nonlinear,
      compile_time: compileTime,
      proving_time: 0,
    };

    resultsModel.insertCompileResult(compileResult, (err, resultId) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ message: 'Compile done', compileResult, resultId });
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function proveAndSave(req, res) {
  try {
    const { name, version_hash, inputJson } = req.body;
    
    // Validate required parameters
    if (!name || !version_hash || !inputJson) {
      return res.status(400).json({ 
        error: 'Missing required parameters: name, version_hash, and inputJson are required' 
      });
    }
    
    const inputHash = hashContent(inputJson);
    const inputFile = path.join(__dirname, `../inputs/${name}-${inputHash}.json`);
    fs.writeFileSync(inputFile, inputJson);

    const outputDir = path.join(__dirname, `../outputs/${version_hash}`);
    const scriptPath = path.join(__dirname, '../scripts/snark3.sh');
    const cmd = `"${scriptPath}" "${version_hash}" "${inputFile}"`;

    console.log(`Executing command: ${cmd}`);
    await execPromise(cmd);

    const log = fs.readFileSync(path.join(outputDir, `${version_hash}_js/prove.log`)).toString();
    const provingTime = extractNumber(log, /Proving time \(ms\): (\d+)/);

    const circuit = await getCircuitByHash(version_hash);
    const lastCompile = await getLatestCompile(circuit.id);

    db.run(`UPDATE CompileResults SET proving_time = ? WHERE id = ?`, [provingTime, lastCompile.id]);
    res.json({ message: 'Proving complete', proving_time: provingTime });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

function deleteCircuit(req, res) {
  const { version_hash } = req.params;
  db.run(`DELETE FROM Circuits WHERE version_hash = ?`, [version_hash], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: 'Circuit deleted' });
  });
}

function getAllCircuits(req, res) {
  const sql = `
  SELECT
    c.name,
    c.version_hash,
    cr.opt_level,
    cr.constraint_total,
    cr.constraint_linear,
    cr.constraint_non_linear,
    cr.compile_time,
    cr.proving_time,
    cr.recorded_at
  FROM Circuits c
  JOIN CompileResults cr ON cr.circuit_id = c.id
  ORDER BY cr.recorded_at DESC;
  `;
  
  const db = require('../database/db');
  db.all(sql, [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
}


// Helpers
function execPromise(cmd) {
  return new Promise((resolve, reject) => {
    exec(cmd, { cwd: path.resolve(__dirname, '../') }, (err, stdout, stderr) => {
      if (err) return reject(err);
      resolve(stdout.toString());
    });
  });
}

function extractNumber(text, regex) {
  const match = text.match(regex);
  return match ? parseInt(match[1]) : 0;
}

function upsertCircuit(name, hash) {
  return new Promise((resolve, reject) => {
    circuitsModel.getCircuitByHash(hash, (err, circuit) => {
      if (err) reject(err);
      if (circuit) resolve(circuit);
      else circuitsModel.createCircuit(name, hash, (err, id) => {
        if (err) reject(err);
        resolve({ id, name, version_hash: hash });
      });
    });
  });
}

function getCircuitByHash(hash) {
  return new Promise((resolve, reject) => {
    circuitsModel.getCircuitByHash(hash, (err, circuit) => {
      if (err) reject(err);
      if (!circuit) reject(new Error('Circuit version not found.'));
      resolve(circuit);
    });
  });
}

function getLatestCompile(circuit_id) {
  return new Promise((resolve, reject) => {
    resultsModel.getResultsByCircuitId(circuit_id, (err, rows) => {
      if (err) reject(err);
      resolve(rows[0]);
    });
  });
}

module.exports = {
  compileAndSave,
  proveAndSave,
  deleteCircuit,
  getAllCircuits,
};
