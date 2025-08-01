import * as ethers from 'ethers'

import * as ethereumConnector from '../ethereumConnector.mjs'

const LOCAL_RPC_ENDPOINT = "http://127.0.0.1:8545/"

// Smart contract deployment script

// Connect to local Hardhat node
let blockchainProvider = ethereumConnector.createJsonRpcProvider(LOCAL_RPC_ENDPOINT)

let deployerWallet = await blockchainProvider.getSigner(0)
// Alternative: create wallet from private key
// let deployerWallet = new ethers.Wallet("0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80", blockchainProvider)
// Alternative: create wallet from mnemonic
// let deployerWallet = new ethers.Wallet.fromMnemonic("word1 word2 ...")

let contractMetadata
let deploymentReceipt

contractMetadata = ethereumConnector.loadJsonFile("CircomHasher2.json")
let Hasher2Factory = new ethers.ContractFactory(contractMetadata.abi, contractMetadata.bytecode, deployerWallet)
let hasher2Contract = await Hasher2Factory.deploy()
// Wait for deployment confirmation
deploymentReceipt = await hasher2Contract.deploymentTransaction().wait()
console.log(deploymentReceipt)

contractMetadata = ethereumConnector.loadJsonFile("CircomHasher3.json")
let Hasher3Factory = new ethers.ContractFactory(contractMetadata.abi, contractMetadata.bytecode, deployerWallet)
let hasher3Contract = await Hasher3Factory.deploy()
// Wait for deployment confirmation
deploymentReceipt = await hasher3Contract.deploymentTransaction().wait()
console.log(deploymentReceipt)

contractMetadata = ethereumConnector.loadJsonFile("./artifacts/contracts/TestToken.sol/TestToken.json")
let TestTokenFactory = new ethers.ContractFactory(contractMetadata.abi, contractMetadata.bytecode, deployerWallet)
let testTokenContract = await TestTokenFactory.deploy()
// Wait for deployment confirmation
deploymentReceipt = await testTokenContract.deploymentTransaction().wait()
console.log(deploymentReceipt)

contractMetadata = ethereumConnector.loadJsonFile("./artifacts/contracts/Rollup.sol/Rollup.json")
let RollupFactory = new ethers.ContractFactory(contractMetadata.abi, contractMetadata.bytecode, deployerWallet)
let rollupContract = await RollupFactory.deploy(await testTokenContract.getAddress(), await hasher2Contract.getAddress(), await hasher3Contract.getAddress())
// Wait for deployment confirmation
deploymentReceipt = await rollupContract.deploymentTransaction().wait()
console.log(deploymentReceipt)

console.log("const TEST_TOKEN_CONTRACT_ADDRESS = \"" + await testTokenContract.getAddress() + "\";")
console.log("const ROLLUP_CONTRACT_ADDRESS = \"" + await rollupContract.getAddress() + "\";")