#!/bin/sh
  
if [ $# -lt 1 ]; then
  echo "Must provide Circom filename prefix (without the .circom extension)"
  exit 1
fi

# Method can be plonk or groth16
SIZE=23
METHOD=groth16

NAME=$1
ZKEY_NAME=$(echo "$NAME" | tr '[:upper:]' '[:lower:]')
PTAU_FINAL="../ptau/pot${SIZE}_final.ptau"
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

echo "Using circom simplification flag: $SIMP_LEVEL"

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
  snarkjs plonk setup ../${NAME}.r1cs $PTAU_FINAL ${ZKEY_NAME}_final.zkey
fi

if [ ${METHOD} = "groth16" ]; then
  time -v snarkjs groth16 setup ../${NAME}.r1cs $PTAU_FINAL ${ZKEY_NAME}_0000.zkey && \
  # snarkjs zkey contribute ${ZKEY_NAME}_0000.zkey ${ZKEY_NAME}_0001.zkey --name="First contributor" -v -e && \
  # snarkjs zkey contribute ${ZKEY_NAME}_0001.zkey ${ZKEY_NAME}_final.zkey --name="Second contributor" -v -e
  time -v snarkjs zkey contribute ${ZKEY_NAME}_0000.zkey ${ZKEY_NAME}_final.zkey --name="First contributor" -v -e
fi

time -v snarkjs zkey export verificationkey ${ZKEY_NAME}_final.zkey verification_key.json