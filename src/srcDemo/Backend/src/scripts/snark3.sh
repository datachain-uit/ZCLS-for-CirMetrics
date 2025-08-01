#!/bin/sh
if [ $# -lt 2 ]; then
  echo "Usage: $0 CIRCUIT_HASH INPUT_JSON"
  exit 1
fi

CIRCUIT_HASH=$1
INPUT_JSON=$2
OUTPUT_DIR="./outputs/${CIRCUIT_HASH}"

# Convert to absolute path if it's a relative path
if [ ! -f "$INPUT_JSON" ]; then
    # Try with absolute path from the original working directory
    ABS_INPUT_JSON="$(cd "$(dirname "$0")/.." && pwd)/${INPUT_JSON}"
    if [ -f "$ABS_INPUT_JSON" ]; then
        INPUT_JSON="$ABS_INPUT_JSON"
    else
        echo "ERROR: Input file not found: $INPUT_JSON"
        exit 1
    fi
fi

cd ${OUTPUT_DIR}/${CIRCUIT_HASH}_js || { echo "Cannot cd to ${OUTPUT_DIR}/${CIRCUIT_HASH}_js"; exit 1; }

echo "Generating witness..."
node generate_witness.js ${CIRCUIT_HASH}.wasm ${INPUT_JSON} ${CIRCUIT_HASH}.wtns || { echo "Witness generation failed"; exit 1; }

echo "Generating proof..."
start_prove=$(date +%s%3N)
snarkjs groth16 prove ${CIRCUIT_HASH}_final.zkey ${CIRCUIT_HASH}.wtns proof.json public.json > prove.log 2>&1
end_prove=$(date +%s%3N)
prove_time=$((end_prove - start_prove))
echo "Proving time (ms): ${prove_time}" >> prove.log

# Check if proving was successful
if [ ! -f "proof.json" ] || [ ! -f "public.json" ]; then
    echo "ERROR: Proving failed. Check prove.log for details."
    cat prove.log
    exit 1
fi

echo "Proof generation completed successfully."
