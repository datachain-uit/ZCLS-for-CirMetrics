const fs = require('fs');

// Read the actual log file
const log = fs.readFileSync('./outputs/8072527491c99e28c88fb019d860a9a7060d6ce4ba91919ab030c708f5430a28/compile.log', 'utf8');

console.log('=== Raw log (showing first 200 chars) ===');
console.log(log.substring(0, 200));

console.log('\n=== Raw log with escape sequences visible ===');
console.log(JSON.stringify(log.substring(0, 200)));

// Clean ANSI codes
const cleanedLog = log.replace(/\x1b\[[0-9;]*m/g, '');

console.log('\n=== Cleaned log ===');
console.log(cleanedLog);

// Test regex
function extractNumber(text, regex) {
  const match = text.match(regex);
  console.log(`Regex ${regex} found:`, match);
  return match ? parseInt(match[1]) : 0;
}

console.log('\n=== Testing regex ===');
const linear = extractNumber(cleanedLog, /linear constraints:\s+(\d+)/);
const nonlinear = extractNumber(cleanedLog, /non-linear constraints:\s+(\d+)/);

console.log(`Final values: linear=${linear}, nonlinear=${nonlinear}, total=${linear + nonlinear}`);
