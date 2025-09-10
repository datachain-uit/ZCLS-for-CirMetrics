#!/bin/bash
# filepath: /mnt/d/vscode/ZCLS-for-CirMetrics/src/scripts/benchmark-proving.sh

if [ $# -lt 4 ]; then
  echo "Usage: $0 CIRCUIT_NAME BATCH_SIZE SIMP_LEVEL METHOD"
  echo "Example: ./benchmark-proving.sh RollupValidator 8 o1 groth16"
  exit 1
fi

CIRCUIT_NAME=$1
BATCH_SIZE=$2
SIMP_LEVEL=$3
METHOD=$4

DIRECTORY="scripts"

mkdir -p logs

LOGFILE="logs/benchmark_proving_${CIRCUIT_NAME}_batch${BATCH_SIZE}_${SIMP_LEVEL}_${METHOD}_10runs.log"

echo "Running prove-inapp-only.mjs 10 times" | tee $LOGFILE
echo "Parameters: $CIRCUIT_NAME $BATCH_SIZE $SIMP_LEVEL $METHOD" | tee -a $LOGFILE
echo "Batch Size: $BATCH_SIZE" | tee -a $LOGFILE
echo "================================================" | tee -a $LOGFILE

for i in $(seq 1 10)
do
  echo "========== Run $i (batch_size=$BATCH_SIZE) ==========" | tee -a $LOGFILE

  time -v node "${DIRECTORY}/prove-inapp-only.mjs" $CIRCUIT_NAME 2>&1 | sed 's/\x1b\[[0-9;]*m//g' | tee -a $LOGFILE

  echo "================================================" | tee -a $LOGFILE
done

echo "Completed 10 runs. Log saved to: $LOGFILE"