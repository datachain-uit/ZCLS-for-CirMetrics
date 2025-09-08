#!/bin/bash
# filepath: /mnt/d/vscode/ZCLS-for-CirMetrics/src/scripts/run-compilation-proving-local-only-10times.sh

if [ $# -lt 4 ]; then
  echo "Usage: $0 CIRCUIT_NAME BATCH_SIZE SIMP_LEVEL METHOD"
  echo "Example: ./run-compilation-proving-local-only-10times.sh RollupValidator 8 o1 groth16"
  exit 1
fi

CIRCUIT_NAME=$1
BATCH_SIZE=$2
SIMP_LEVEL=$3
METHOD=$4

DIRECTORY="scripts"

mkdir -p logs

LOGFILE="logs/run_compilation_proving_local_only_${CIRCUIT_NAME}_batch${BATCH_SIZE}_${SIMP_LEVEL}_${METHOD}_10runs.log"

echo "Running proving-local-only.sh 10 times, then compilation-only.sh 10 times" | tee $LOGFILE
echo "Parameters: $CIRCUIT_NAME $BATCH_SIZE $SIMP_LEVEL $METHOD" | tee -a $LOGFILE
echo "Batch Size: $BATCH_SIZE" | tee -a $LOGFILE
echo "================================================" | tee -a $LOGFILE

# Chạy 10 lần proving-local-only.sh trước
for i in $(seq 1 10)
do
  echo "========== Prove Run $i (batch_size=$BATCH_SIZE) ==========" | tee -a $LOGFILE
  sh "${DIRECTORY}/proving-local-only.sh" $CIRCUIT_NAME $METHOD 2>&1 | sed 's/\x1b\[[0-9;]*m//g' | tee -a $LOGFILE
  echo "================================================" | tee -a $LOGFILE
done

# Sau đó chạy 10 lần compilation-only.sh
for i in $(seq 1 10)
do
  echo "========== Compile Run $i (batch_size=$BATCH_SIZE) ==========" | tee -a $LOGFILE
  sh "${DIRECTORY}/compilation-only.sh" $CIRCUIT_NAME $SIMP_LEVEL 2>&1 | sed 's/\x1b\[[0-9;]*m//g' | tee -a $LOGFILE
  echo "================================================" | tee -a $LOGFILE
done

echo "Completed 10 runs for proving and compiling. Log saved to: $LOGFILE"