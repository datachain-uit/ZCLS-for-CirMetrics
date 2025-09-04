#!/bin/sh
  
if [ $# -lt 1 ]; then
  echo "Usage: $0 CIRCUIT_NAME [SIMP_LEVEL] [METHOD] [PTAU_SIZE]"
  echo "Must provide Circom filename prefix (without the .circom extension)"
  echo "  CIRCUIT_NAME: Circom filename prefix (without .circom extension)"
  echo "  SIMP_LEVEL: o0, o1, o2 (default: o1)"
  echo "  PTAU_SIZE: 19-24 (default: 19)"
  echo "  METHOD: groth16, plonk (default: groth16)"
  exit 1
fi

NAME=$1
ZKEY_NAME=$(echo "$NAME" | tr '[:upper:]' '[:lower:]')
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

# Choose method
METHOD="groth16"
if [ $# -ge 3 ]; then
  case "$3" in
    groth16|plonk) METHOD=$3 ;;
    *) echo "Unknown method $3 (must be groth16 or plonk), using default: groth16"; METHOD="groth16" ;;
  esac
fi

# Choose ptau size (19-24)
SIZE=19
if [ $# -ge 4 ]; then
  case "$4" in
    19|20|21|22|23|24) SIZE=$4 ;;
    *) echo "Invalid ptau size $4 (must be 19-24), using default: 19"; SIZE=19 ;;
  esac
fi

PTAU_FINAL="../ptau/pot${SIZE}_final.ptau"

echo "Configuration:"
echo "  Circuit: ${NAME}.circom"
echo "  Optimization: $SIMP_LEVEL"
echo "  PTAU size: $SIZE (supports up to 2^${SIZE} constraints)"
echo "  Method: $METHOD"
echo "  PTAU file: $PTAU_FINAL"

# Circuit-specific for Groth16:
#  - Generate proving/verification keys
#  - *_0000.zkey has zero contributions, so we add one contribution into *_0001

start_compile=$(date +%s%3N)
time -v circom ${DIRECTORY}/${NAME}.circom --r1cs --wasm --sym $SIMP_LEVEL && \
end_compile=$(date +%s%3N)
compile_time=$((end_compile - start_compile))
echo "Compile time for ${NAME}.circom: ${compile_time} ms"

cd ${NAME}_js && \

if [ ${METHOD} = "plonk" ]; then
  time snarkjs plonk setup ../${NAME}.r1cs $PTAU_FINAL ${ZKEY_NAME}_final.zkey
fi

if [ ${METHOD} = "groth16" ]; then
  time -v snarkjs groth16 setup ../${NAME}.r1cs $PTAU_FINAL ${ZKEY_NAME}_0000.zkey && \
  # snarkjs zkey contribute ${ZKEY_NAME}_0000.zkey ${ZKEY_NAME}_0001.zkey --name="First contributor" -v -e && \
  # snarkjs zkey contribute ${ZKEY_NAME}_0001.zkey ${ZKEY_NAME}_final.zkey --name="Second contributor" -v -e
  time -v snarkjs zkey contribute ${ZKEY_NAME}_0000.zkey ${ZKEY_NAME}_final.zkey --name="First contributor" -v -e
fi

time -v snarkjs zkey export verificationkey ${ZKEY_NAME}_final.zkey verification_key.json