import fs from 'fs'
import { ethers } from 'ethers'

// Create Infura provider for Ethereum mainnet
// Replace with your own Infura project ID for production use
export function createInfuraProvider() {
	const provider = new ethers.InfuraProvider("homestead", 'fc0ce324e349457ba615cbaba69ef5a1')
	return provider
}

export function createJsonRpcProvider(rpcEndpoint) {
	const provider = new ethers.JsonRpcProvider(rpcEndpoint)
	return provider
}

export function createEmbeddedSigner(provider, accountIndex) {
	return provider.getSigner(accountIndex)
}

export function createWalletSigner(provider, mnemonic) {
	return new ethers.Wallet.fromMnemonic(mnemonic)
}

export function loadJsonFile(jsonPath) {
	var fileContents = fs.readFileSync(jsonPath, 'utf-8')
	return JSON.parse(fileContents)
}

export function createContractFactoryFromSolidity(compiledJsonPath, signerInstance) {
	var compiledContract = fs.readFileSync(compiledJsonPath, 'utf-8')
	return ethers.ContractFactory.fromSolidity(compiledContract, signerInstance)
}

// Create contract factory from ABI and bytecode
// ABI can be from compiled JSON or human-readable format
// Bytecode must be from compiled JSON
export function createContractFactory(contractAbi, contractBytecode, signerInstance) {
	return new ethers.ContractFactory(contractAbi, contractBytecode, signerInstance)
}

export async function deployContractInstance(contractFactory, ...constructorArgs) {
	var contractInstance = await contractFactory.deploy(...constructorArgs)

	// Wait for contract deployment to be mined
	await contractInstance.deployTransaction.wait()

	return contractInstance
}
export function connectToContract(provider, contractAddress, contractInterface) {
	return new ethers.Contract(contractAddress, contractInterface, provider)
}