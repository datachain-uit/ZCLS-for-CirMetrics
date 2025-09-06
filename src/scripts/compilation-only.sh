#!/bin/sh
# filepath: /mnt/d/vscode/ZCLS-for-CirMetrics/src/scripts/compile-circuit-only.sh

if [ $# -lt 1 ]; then
  echo "Usage: $0 CIRCUIT_NAME [SIMP_LEVEL]"
  echo "  CIRCUIT_NAME: Circom filename prefix (without .circom extension)"
  echo "  SIMP_LEVEL: o0, o1, o2 (default: o1)"
  exit 1
fi

NAME=$1
DIRECTORY="circuits"

# Choose simplification flag
SIMP_LEVEL="--O1"
if [ $# -ge 2 ]; then
  case "$2" in
    o0) SIMP_LEVEL="--O0" ;;
    o1) SIMP_LEVEL="--O1" ;;
    o2) SIMP_LEVEL="--O2" ;;
    *) echo "Unknown optimization level $2, using --O1"; SIMP_LEVEL="--O1" ;;
  esac
fi

echo "Configuration:"
echo "  Circuit: ${NAME}.circom"
echo "  Optimization: $SIMP_LEVEL"

start_compile=$(date +%s%3N)
time -v circom ${DIRECTORY}/${NAME}.circom --r1cs --wasm --sym $SIMP_LEVEL
end_compile=$(date +%s%3N)
compile_time=$((end_compile - start_compile))
echo "Compile time for ${NAME}.circom: ${compile_time} ms"