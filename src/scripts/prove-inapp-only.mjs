import { wtns, groth16 } from "snarkjs";
import fs from "fs";
import path from "path";

const [, , circuitName] = process.argv;

if (!circuitName) {
    console.error("Usage: node prove-inapp-only.mjs <CIRCUIT_NAME>");
    process.exit(1);
}

const folder = `${circuitName}_js`;
const wasmPath = path.join(folder, `${circuitName}.wasm`);
const inputPath = path.join(folder, `input.json`);
const zkeyPath = path.join(folder, `${circuitName}_final.zkey`);
const proofPath = path.join(folder, `proof.json`);
const publicPath = path.join(folder, `public.json`);

if (!fs.existsSync(wasmPath) || !fs.existsSync(zkeyPath) || !fs.existsSync(inputPath)) {
    console.error(`Missing file: ${!fs.existsSync(wasmPath) ? wasmPath : !fs.existsSync(zkeyPath) ? zkeyPath : inputPath}`);
    process.exit(1);
}

// Đọc input
const input = JSON.parse(fs.readFileSync(inputPath, "utf8"));

// Tính witness dạng memory
let witnessMem = { type: "mem" };
await wtns.calculate(input, wasmPath, witnessMem);

// Prove
const start = Date.now();
const { proof, publicSignals } = await groth16.prove(zkeyPath, witnessMem);
const end = Date.now();

fs.writeFileSync(proofPath, JSON.stringify(proof));
fs.writeFileSync(publicPath, JSON.stringify(publicSignals));

const proofSize = fs.statSync(proofPath).size;

console.log("Proving time (ms):", end - start);
console.log(`Proof saved to: ${proofPath}`);
console.log(`Public signals saved to: ${publicPath}`);
console.log(`Proof size (bytes): ${proofSize}`);

process.exit(0);