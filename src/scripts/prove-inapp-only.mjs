import { wtns, groth16, plonk } from "snarkjs";
import fs from "fs";
import path from "path";

const [, , circuitName, method] = process.argv;

if (!circuitName) {
    console.error("Usage: node prove-inapp-only.mjs <CIRCUIT_NAME> [METHOD]");
    console.error("  CIRCUIT_NAME: Circuit name");
    console.error("  METHOD: groth16 or plonk (default: groth16)");
    process.exit(1);
}

// Default method is groth16
const provingMethod = method || "groth16";

if (!["groth16", "plonk"].includes(provingMethod)) {
    console.error("Error: METHOD must be either 'groth16' or 'plonk'");
    process.exit(1);
}

const folder = `${circuitName}_js`;
const wasmPath = path.join(folder, `${circuitName}.wasm`);
const inputPath = path.join(folder, `input.json`);
const zkeyPath = path.join(folder, `${circuitName.toLowerCase()}_final.zkey`);

const proofPath = path.join(folder, `proof.json`);
const publicPath = path.join(folder, `public.json`);

if (!fs.existsSync(wasmPath) || !fs.existsSync(zkeyPath) || !fs.existsSync(inputPath)) {
    console.error(`Missing file: ${!fs.existsSync(wasmPath) ? wasmPath : !fs.existsSync(zkeyPath) ? zkeyPath : inputPath}`);
    process.exit(1);
}

console.log(`Using ${provingMethod.toUpperCase()} proving system`);

// Đọc input
const input = JSON.parse(fs.readFileSync(inputPath, "utf8"));

// Tính witness dạng memory
let witnessMem = { type: "mem" };
await wtns.calculate(input, wasmPath, witnessMem);

// Prove dựa trên method
const start = Date.now();
let proof, publicSignals;

if (provingMethod === "groth16") {
    ({ proof, publicSignals } = await groth16.prove(zkeyPath, witnessMem));
} else {
    ({ proof, publicSignals } = await plonk.prove(zkeyPath, witnessMem));
}

const end = Date.now();

fs.writeFileSync(proofPath, JSON.stringify(proof));
fs.writeFileSync(publicPath, JSON.stringify(publicSignals));

const proofSize = fs.statSync(proofPath).size;

console.log(`Proving method: ${provingMethod.toUpperCase()}`);
console.log("Proving time (ms):", end - start);
console.log(`Proof saved to: ${proofPath}`);
console.log(`Public signals saved to: ${publicPath}`);
console.log(`Proof size (bytes): ${proofSize}`);

process.exit(0);