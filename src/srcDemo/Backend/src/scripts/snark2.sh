# #!/bin/sh

# if [ $# -lt 3 ]; then
#   echo "Usage: $0 CIRCUIT_FILE CIRCUIT_HASH SIMP_LEVEL"
#   exit 1
# fi

# CIRCUIT_FILE="$1"
# CIRCUIT_HASH="$2"
# SIMP_LEVEL="$3"
# OUTPUT_DIR="./outputs/${CIRCUIT_HASH}"

# case "$SIMP_LEVEL" in
#   o0) SIMP_LEVEL="--O0" ;;
#   o1) SIMP_LEVEL="--O1" ;;
#   o2) SIMP_LEVEL="--O2" ;;
#   *) echo "Unknown optimization level $SIMP_LEVEL, using --O1"; SIMP_LEVEL="--O1" ;;
# esac

# mkdir -p "${OUTPUT_DIR}"
# cp "${CIRCUIT_FILE}" "${OUTPUT_DIR}/${CIRCUIT_HASH}.circom"

# PTAU_FINAL="../ptau/pot19_final.ptau"

# cd "${OUTPUT_DIR}" || { echo "Cannot cd to ${OUTPUT_DIR}"; exit 1; }

# start_compile=$(date +%s%3N)
# circom "${CIRCUIT_HASH}.circom" --r1cs --wasm --sym ${SIMP_LEVEL} > compile.log || { echo "Compilation failed"; exit 1; }
# end_compile=$(date +%s%3N)
# compile_time=$((end_compile - start_compile))
# echo "Compile time (ms): ${compile_time}" >> compile.log

# if [ ! -f "${CIRCUIT_HASH}.r1cs" ]; then
#   echo "ERROR: Compilation failed. .r1cs file not found."
#   cat compile.log
#   exit 1
# fi

# if [ ! -d "${CIRCUIT_HASH}_js" ]; then
#   echo "ERROR: ${CIRCUIT_HASH}_js directory missing → Compile failed."
#   cat compile.log
#   exit 1
# fi

# cd "${CIRCUIT_HASH}_js" || { echo "Cannot cd to ${CIRCUIT_HASH}_js"; exit 1; }

# echo "Running snarkjs setup..."
# snarkjs groth16 setup "../${CIRCUIT_HASH}.r1cs" "${PTAU_FINAL}" "${CIRCUIT_HASH}_0000.zkey" || { echo "groth16 setup failed"; exit 1; }
# snarkjs zkey contribute "${CIRCUIT_HASH}_0000.zkey" "${CIRCUIT_HASH}_0001.zkey" --name="First contributor" -e=1 -v || { echo "contribute failed"; exit 1; }

# if [ ! -f "${CIRCUIT_HASH}_0001.zkey" ]; then
#   echo "ERROR: ${CIRCUIT_HASH}_0001.zkey not generated → contribution failed."
#   exit 1
# fi

# snarkjs zkey export verificationkey "${CIRCUIT_HASH}_0001.zkey" "../verification_key.json"
# mv "${CIRCUIT_HASH}_0001.zkey" ../final.zkey

# echo "✅ Success: Compilation and setup completed for ${CIRCUIT_HASH}"

#!/bin/sh
if [ $# -lt 3 ]; then
  echo "Usage: $0 CIRCUIT_FILE CIRCUIT_HASH SIMP_LEVEL"
  exit 1
fi

CIRCUIT_FILE=$1
CIRCUIT_HASH=$2
SIMP_LEVEL=$3
OUTPUT_DIR="./outputs/${CIRCUIT_HASH}"

echo "DEBUG: Received SIMP_LEVEL = $SIMP_LEVEL"

case "$SIMP_LEVEL" in
  o0) SIMP_LEVEL="--O0" ;;
  o1) SIMP_LEVEL="--O1" ;;
  o2) SIMP_LEVEL="--O2" ;;
  *) echo "Unknown optimization level $SIMP_LEVEL, using --O1"; SIMP_LEVEL="--O1" ;;
esac

echo "DEBUG: Converted SIMP_LEVEL = $SIMP_LEVEL"

mkdir -p ${OUTPUT_DIR}
cp "${CIRCUIT_FILE}" "${OUTPUT_DIR}/${CIRCUIT_HASH}.circom"

# Get the absolute path to the ptau file
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PTAU_FINAL="${SCRIPT_DIR}/../ptau/pot19_final.ptau"
METHOD=groth16

cd ${OUTPUT_DIR}
start_compile=$(date +%s%3N)
time circom ${CIRCUIT_HASH}.circom --r1cs --wasm --sym ${SIMP_LEVEL} -l ../../../node_modules > compile.log 2>&1
end_compile=$(date +%s%3N)
compile_time=$((end_compile - start_compile))
echo "Compile time (ms): ${compile_time}" >> compile.log

# Check if compilation was successful
if [ ! -f "${CIRCUIT_HASH}.r1cs" ] || [ ! -d "${CIRCUIT_HASH}_js" ]; then
    echo "ERROR: Compilation failed. Check compile.log for details."
    cat compile.log
    exit 1
fi

cd ${CIRCUIT_HASH}_js || { echo "Cannot cd to ${CIRCUIT_HASH}_js"; exit 1; }

echo "Running snarkjs groth16 setup..."
snarkjs groth16 setup ../${CIRCUIT_HASH}.r1cs ${PTAU_FINAL} ${CIRCUIT_HASH}_0000.zkey || { echo "groth16 setup failed"; exit 1; }

echo "Running first contribution..."
snarkjs zkey contribute ${CIRCUIT_HASH}_0000.zkey ${CIRCUIT_HASH}_0001.zkey --name="First contributor" -v -e || { echo "First contribution failed"; exit 1; }

echo "Running second contribution..."
snarkjs zkey contribute ${CIRCUIT_HASH}_0001.zkey ${CIRCUIT_HASH}_final.zkey --name="Second contributor" -v -e || { echo "Second contribution failed"; exit 1; }

echo "Exporting verification key..."
snarkjs zkey export verificationkey ${CIRCUIT_HASH}_final.zkey ../verification_key.json || { echo "Export verification key failed"; exit 1; } 
# mv ${CIRCUIT_HASH}_0001.zkey ../final.zkey