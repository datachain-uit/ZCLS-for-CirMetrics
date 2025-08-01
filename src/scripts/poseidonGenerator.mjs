import { poseidonContract } from 'circomlibjs';
import fs from 'fs';

function generatePoseidonContract(inputCount) {
  const contractFileName = 'CircomHasher' + inputCount + '.json'

  const contractData = {
    contractName: 'CircomHasher' + inputCount,
    abi: poseidonContract.generateABI(inputCount),
    bytecode: poseidonContract.createCode(inputCount)
  }

  fs.writeFileSync(contractFileName, JSON.stringify(contractData, null, 2))
  console.log(`Generated ${contractFileName} for ${inputCount} inputs`)
}

generatePoseidonContract(2)
generatePoseidonContract(3)
generatePoseidonContract(5)
