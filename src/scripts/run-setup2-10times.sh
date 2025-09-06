#!/bin/bash
# filepath: /home/student22/quangminh/ZCLS-for-CirMetrics/src/scripts/run-setup2-10times.sh

if [ $# -lt 2 ]; then
  echo "Usage: $0 CIRCUIT_NAME BATCH_SIZE [SIMP_LEVEL] [METHOD] [PTAU_SIZE]"
  echo "Example: ./run-setup2-10times.sh RollupValidator 8 o1 groth16 19"
  echo "Example: ./run-setup2-10times.sh BatchVerifier 255 o2 plonk 20"
  exit 1
fi

CIRCUIT_NAME=$1
BATCH_SIZE=$2
SIMP_LEVEL=${3:-o1}
METHOD=${4:-groth16}
PTAU_SIZE=${5:-19}

DIRECTORY="scripts"

# Tạo folder logs nếu chưa có
mkdir -p logs

# Tên logfile với batch size
LOGFILE="logs/setup2_${CIRCUIT_NAME}_batch${BATCH_SIZE}_${SIMP_LEVEL}_${METHOD}_ptau${PTAU_SIZE}_10runs.log"

echo "Running setup2-circuit-compilation.sh 10 times" | tee $LOGFILE
echo "Parameters: $CIRCUIT_NAME $BATCH_SIZE $SIMP_LEVEL $METHOD $PTAU_SIZE" | tee -a $LOGFILE
echo "Batch Size: $BATCH_SIZE" | tee -a $LOGFILE
echo "================================================" | tee -a $LOGFILE

for i in $(seq 1 10)
do
  echo "========== Run $i (batch_size=$BATCH_SIZE) ==========" | tee -a $LOGFILE
  
  # Chạy setup2 script với parameters
  sh "${DIRECTORY}/setup2-circuit-compilation.sh" $CIRCUIT_NAME $SIMP_LEVEL $METHOD $PTAU_SIZE 2>&1 | sed 's/\x1b\[[0-9;]*m//g' | tee -a $LOGFILE
  
  echo "================================================" | tee -a $LOGFILE
done

echo "Completed 10 runs. Log saved to: $LOGFILE"