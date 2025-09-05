#!/bin/bash
# filepath: /home/student22/quangminh/ZCLS-for-CirMetrics/src/scripts/run-setup3-10times.sh

if [ $# -lt 2 ]; then
  echo "Usage: $0 CIRCUIT_NAME BATCH_SIZE [METHOD]"
  echo "Example: ./run-setup3-10times.sh TxValidator 8 groth16"
  echo "Example: ./run-setup3-10times.sh BatchVerifier 255 plonk"
  exit 1
fi

CIRCUIT_NAME=$1
BATCH_SIZE=$2
METHOD=${3:-groth16}

DIRECTORY="scripts"

# Tạo folder logs nếu chưa có
mkdir -p logs

# Tên logfile với batch size
LOGFILE="logs/setup3_${CIRCUIT_NAME}_batch${BATCH_SIZE}_${METHOD}_10runs.log"

echo "Running setup3-witness-proving.sh 10 times" | tee $LOGFILE
echo "Parameters: $CIRCUIT_NAME $BATCH_SIZE $METHOD" | tee -a $LOGFILE
echo "Batch Size: $BATCH_SIZE" | tee -a $LOGFILE
echo "================================================" | tee -a $LOGFILE

for i in $(seq 1 10)
do
  echo "========== Run $i (batch_size=$BATCH_SIZE) ==========" | tee -a $LOGFILE
  
  # Chạy setup3 script với parameters
  sh "${DIRECTORY}/setup3-witness-proving.sh" $CIRCUIT_NAME $METHOD 2>&1 | sed 's/\x1b\[[0-9;]*m//g' | tee -a $LOGFILE
  
  echo "================================================" | tee -a $LOGFILE
done

echo "Completed 10 runs. Log saved to: $LOGFILE"