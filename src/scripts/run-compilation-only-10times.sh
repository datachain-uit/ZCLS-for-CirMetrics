#!/bin/bash
# filepath: /home/student22/quangminh/ZCLS-for-CirMetrics/src/scripts/run-compilation-only-10times.sh

if [ $# -lt 3 ]; then
  echo "Usage: $0 CIRCUIT_NAME BATCH_SIZE SIMP_LEVEL METHOD"
  echo "  CIRCUIT_NAME: Circom filename prefix (without .circom extension)"
  echo "  BATCH_SIZE: batch size for benchmarking"
  echo "  SIMP_LEVEL: o0, o1, o2"
  echo "  METHOD: groth16, plonk, ..."
  exit 1
fi

CIRCUIT_NAME=$1
BATCH_SIZE=$2
SIMP_LEVEL=$3
METHOD=$4
DIRECTORY="scripts"

mkdir -p logs


LOGFILE="logs/compilation_only_${CIRCUIT_NAME}_batch${BATCH_SIZE}_${SIMP_LEVEL}_${METHOD}_10runs.log"

echo "Running compilation-only.sh 10 times" | tee $LOGFILE
echo "Parameters: $CIRCUIT_NAME $BATCH_SIZE $SIMP_LEVEL $METHOD" | tee -a $LOGFILE
echo "Batch Size: $BATCH_SIZE" | tee -a $LOGFILE
echo "================================================" | tee -a $LOGFILE

for i in $(seq 1 10)
do
  echo "========== Run $i (batch_size=$BATCH_SIZE) ==========" | tee -a $LOGFILE
  sh "${DIRECTORY}/compilation-only.sh" $CIRCUIT_NAME $SIMP_LEVEL 2>&1 | sed 's/\x1b\[[0-9;]*m//g' | tee -a $LOGFILE
  echo "================================================" | tee -a $LOGFILE
done

echo "Completed 10 runs. Log saved to:  $LOGFILE"