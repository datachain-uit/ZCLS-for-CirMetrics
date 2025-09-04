#!/bin/sh
  
if [ $# -lt 1 ]; then
  echo "Usage: $0 CIRCUIT_NAME [METHOD]"
  echo "Must provide Circom filename prefix (without the .circom extension)"
  echo "  CIRCUIT_NAME: Circom filename prefix (without .circom extension)"
  echo "  METHOD: groth16, plonk (default: groth16)"
  exit 1
fi

INPUT="input.json"

NAME=$1
ZKEY_NAME=$(echo "$NAME" | tr '[:upper:]' '[:lower:]')

# Choose method
METHOD="groth16"
if [ $# -ge 2 ]; then
  case "$2" in
    groth16|plonk) METHOD=$2 ;;
    *) echo "Unknown method $2 (must be groth16 or plonk), using default: groth16"; METHOD="groth16" ;;
  esac
fi

echo "Configuration:"
echo "  Circuit: ${NAME}"
echo "  Method: $METHOD"

cd ${NAME}_js

if [ ! -f "input.json" ]; then
  echo "Edit or link input.json file in ${NAME}_js (check the \"inputs\" directory)"
  exit 1
fi

time -v node generate_witness.js ${NAME}.wasm ${INPUT} ${NAME}.wtns && \
time -v snarkjs ${METHOD} prove ${ZKEY_NAME}_final.zkey ${NAME}.wtns proof.json public.json && \
time -v snarkjs ${METHOD} verify verification_key.json public.json proof.json
