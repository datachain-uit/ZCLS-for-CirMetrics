#!/bin/bash
# filepath: /mnt/d/vscode/ZCLS-for-CirMetrics/src/scripts/run-compile-prove-only-10times.sh

if [ $# -lt 4 ]; then
  echo "Usage: $0 CIRCUIT_NAME BATCH_SIZE SIMP_LEVEL METHOD"
  echo "Example: ./run-compile-prove-only-10times.sh RollupValidator 8 o1 groth16"
  exit 1
fi

CIRCUIT_NAME=$1
BATCH_SIZE=$2
SIMP_LEVEL=$3
METHOD=$4

DIRECTORY="scripts"

mkdir -p logs

LOGFILE="logs/compile_prove_only_${CIRCUIT_NAME}_batch${BATCH_SIZE}_${SIMP_LEVEL}_${METHOD}_10runs.log"

echo "Running compilation-only.sh and proving-only.sh 10 times" | tee $LOGFILE
echo "Parameters: $CIRCUIT_NAME $BATCH_SIZE $SIMP_LEVEL $METHOD" | tee -a $LOGFILE
echo "Batch Size: $BATCH_SIZE" | tee -a $LOGFILE
echo "================================================" | tee -a $LOGFILE

for i in $(seq 1 10)
do
  echo "========== Run $i (batch_size=$BATCH_SIZE) ==========" | tee -a $LOGFILE

  # Compile only
  sh "${DIRECTORY}/compilation-only.sh" $CIRCUIT_NAME $SIMP_LEVEL 2>&1 | sed 's/\x1b\[[0-9;]*m//g' | tee -a $LOGFILE

  # Proof generation only
  sh "${DIRECTORY}/proving-only.sh" $CIRCUIT_NAME $METHOD 2>&1 | sed 's/\x1b\[[0-9;]*m//g' | tee -a $LOGFILE

  echo "================================================" | tee -a $LOGFILE
done

echo "Completed 10 runs. Log saved to: $LOGFILE"