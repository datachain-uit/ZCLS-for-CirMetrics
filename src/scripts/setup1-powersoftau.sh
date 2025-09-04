#!/bin/sh

SIZE=19
CURVE=bn128

# If SIZE is provided as argument, use it
if [ $# -ge 1 ]; then
  # Validate SIZE is a positive integer
  if echo "$1" | grep -E '^[0-9]+$' > /dev/null; then
    SIZE=$1
  else
    echo "Error: SIZE must be a positive integer, using default: 19"
  fi
fi

echo "Configuration:"
echo "  PTAU size: $SIZE (supports up to 2^${SIZE} constraints)"
echo "  Curve: $CURVE"
echo "  Output: pot${SIZE}_final.ptau"

mkdir -p ptau
cd ptau
snarkjs powersoftau new ${CURVE} ${SIZE} pot${SIZE}_0000.ptau -v
snarkjs powersoftau contribute pot${SIZE}_0000.ptau pot${SIZE}_0001.ptau --name="First contribution" -v -e
snarkjs powersoftau contribute pot${SIZE}_0001.ptau pot${SIZE}_0002.ptau --name="Second contribution" -v -e
snarkjs powersoftau contribute pot${SIZE}_0002.ptau pot${SIZE}_0003.ptau --name="Third contribution" -v -e
snarkjs powersoftau prepare phase2 pot${SIZE}_0003.ptau pot${SIZE}_final.ptau -v
snarkjs powersoftau export json pot${SIZE}_final.ptau pot${SIZE}_final.json
