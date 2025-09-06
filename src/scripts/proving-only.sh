#!/bin/sh
# filepath: /mnt/d/vscode/ZCLS-for-CirMetrics/src/scripts/prove-only.sh

if [ $# -lt 2 ]; then
  echo "Usage: $0 CIRCUIT_NAME METHOD"
  echo "  CIRCUIT_NAME: Circom filename prefix (without .circom extension)"
  echo "  METHOD: groth16, plonk"
  exit 1
fi

NAME=$1
ZKEY_NAME=$(echo "$NAME" | tr '[:upper:]' '[:lower:]')
METHOD=$2

cd ${NAME}_js

if [ ! -f "${NAME}.wtns" ]; then
  echo "Missing witness file: ${NAME}.wtns"
  exit 1
fi

echo "Proving with method: $METHOD"
time -v snarkjs ${METHOD} prove ${ZKEY_NAME}_final.zkey ${NAME}.wtns proof.json public.json