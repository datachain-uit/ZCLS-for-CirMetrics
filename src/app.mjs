import { buildPoseidon, buildEddsa } from 'circomlibjs'
import { wtns, groth16 } from 'snarkjs'
import { program } from 'commander'
import { utils } from 'ffjavascript'
import fs from 'fs'

import { Wallet } from 'ethers'

import { TransactionSequencer } from './transactionSequencer.mjs'
import * as ethereumConnector from './ethereumConnector.mjs'

// Configuration for benchmarking
const ROLLUP_CONFIG = {
	ACCOUNT_TREE_DEPTH: 8,
	TRANSACTION_TREE_DEPTH: 2,
	BATCH_SIZE: 4, // Easily configurable batch size for benchmarking
	ACTIVE_ACCOUNTS: 3,
	TRANSFER_AMOUNT: 1
}

const RPC_ENDPOINT = "http://127.0.0.1:8545/"

const TEST_TOKEN_CONTRACT_ADDRESS = "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0";
const ROLLUP_CONTRACT_ADDRESS = "0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9";

let blockchainProvider = ethereumConnector.createJsonRpcProvider(RPC_ENDPOINT)
let contractMetadata

contractMetadata = ethereumConnector.loadJsonFile("./artifacts/contracts/TestToken.sol/TestToken.json")
let testTokenContract = ethereumConnector.connectToContract(blockchainProvider, TEST_TOKEN_CONTRACT_ADDRESS, contractMetadata.abi)

contractMetadata = ethereumConnector.loadJsonFile("./artifacts/contracts/Rollup.sol/Rollup.json")
let rollupContract = ethereumConnector.connectToContract(blockchainProvider, ROLLUP_CONTRACT_ADDRESS, contractMetadata.abi)

let primaryWallet = await blockchainProvider.getSigner(0)

let eddsaInstance = await buildEddsa()

let poseidonInstance = await buildPoseidon()

let userAccounts = []

const emptyPublicKey = [0n, 0n]

function loadUserAccounts() {
	const privateKeyStrings = [
		"ac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80",
		"59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d",
		"5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a",
		"7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6",
		"47e179ec197488593b187f80a00eb0da91f1b9d0b13f8733639f19c30a34926a",
		"8b3a350cf5c34c9194ca85829a2df0ec3153be0318b5e2d3348e872092edffba",
		"92db14e403b83dfe3df233f83dfa3a0d7096f21ca9b0d6d6b8d88b2b4ec1564e",
		"4bbbf85ce3377467afe5d46f804f221813b2bb87f24d81f60f1fcdbf7cbf4356",
		"dbda1821b80551c9d65939329250298aa3472ba22feea921c0cf5d620ea67b97"
	]
	const initialBalances = [0, 10, 20, 30, 40, 50, 60, 70, 80, 90]



	for (var i = 0; i < privateKeyStrings.length; i++) {
		let privateKeyBuffer = Buffer.from(privateKeyStrings[i], 'hex')
		let publicKeyPoint = eddsaInstance.prv2pub(privateKeyBuffer)
		let accountBalance = initialBalances[i]

		let publicKeyFormatted = [
			poseidonInstance.F.toObject(publicKeyPoint[0]),
			poseidonInstance.F.toObject(publicKeyPoint[1])
		]

		let userAccount = {
			privkey: privateKeyBuffer,
			pubkey: publicKeyFormatted,
			balance: accountBalance
		}

		userAccounts.push(userAccount)
	}

	//console.log(userAccounts)
}

let rollupSequencer = new TransactionSequencer(ROLLUP_CONFIG.ACCOUNT_TREE_DEPTH, ROLLUP_CONFIG.TRANSACTION_TREE_DEPTH, poseidonInstance, eddsaInstance)

// Metrics tracking object
let performanceMetrics = {
	batch: {
		provingTime: 0,
		proofSize: 0,
		localVerificationTime: 0,
		onchainVerificationTime: 0,
		gasUsed: 0
	},
	withdraw: {
		provingTime: 0,
		proofSize: 0,
		localVerificationTime: 0,
		onchainVerificationTime: 0,
		gasUsed: 0
	}
}

async function processDeposits() {
	await testTokenContract.connect(primaryWallet).approve(await rollupContract.getAddress(), 500n * BigInt(10 ** 18)) // Approve 500 tokens

	console.log("=== DEPOSIT PROCESS ===")
	let totalDepositedWei = 0n
	let totalDepositedRaw = 0

	for (var i = 0; i < userAccounts.length; i++) {
		let userAccount = userAccounts[i]

		console.log(`Depositing account ${i}: ${userAccount.balance} raw units`)
		totalDepositedRaw += userAccount.balance
		totalDepositedWei += BigInt(userAccount.balance)

		// Add deposits to local merkle tree
		rollupSequencer.addDepositToQueue(userAccount.pubkey, userAccount.balance)
		await rollupContract.connect(primaryWallet).deposit([userAccount.pubkey[0], userAccount.pubkey[1]], userAccount.balance, {
			gasLimit: 1000000
		})
	}

	console.log("Total deposited (raw units):", totalDepositedRaw)
	console.log("Total deposited (wei):", totalDepositedWei.toString())

	// Check balance after deposits
	let balanceAfterDeposits = await testTokenContract.balanceOf("0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266")
	console.log("Balance after deposits (wei):", balanceAfterDeposits.toString())
	console.log("Balance after deposits (tokens):", (Number(balanceAfterDeposits) / 10 ** 18).toString())

	rollupSequencer.finalizeDeposits()
	await rollupContract.connect(primaryWallet).processPendingDeposits()
}

async function verifyAndSubmitBatch() {
	let [
		transactionRoot,
		transactionSiblings,
		transactionDirections,
		signaturePoints,
		signatureScalars,
		senderPublicKeys,
		senderBalances,
		receiverPublicKeys,
		receiverBalances,
		sourceAccountSiblings,
		sourceAccountDirections,
		destinationAccountSiblings,
		destinationAccountDirections,
		transferAmounts,
		stateRootHistory,
		initialStateRoot,
		finalStateRoot
	] = rollupSequencer.generateBatchProof()

	const zkCircuitInput = {
		transactionRoot: transactionRoot,
		transactionSiblings: transactionSiblings,
		transactionDirections: transactionDirections,
		signature_R8: signaturePoints,
		signature_S: signatureScalars,
		senderPublicKey: senderPublicKeys,
		senderBalance: senderBalances,
		receiverPublicKey: receiverPublicKeys,
		receiverBalance: receiverBalances,
		senderAccountSiblings: sourceAccountSiblings,
		senderAccountDirections: sourceAccountDirections,
		receiverAccountSiblings: destinationAccountSiblings,
		receiverAccountDirections: destinationAccountDirections,
		transfer_amount: transferAmounts,
		stateRootHistory: stateRootHistory,
		initialStateRoot: initialStateRoot,
		finalStateRoot: finalStateRoot,
		activeLevelsUsed: rollupSequencer.activeTreeLevels
	}

	let formattedInput = utils.stringifyBigInts(zkCircuitInput)
	fs.writeFileSync("./RollupValidator_js/input.json", JSON.stringify(formattedInput, null, 2))
	console.log("Circuit input for batch verification created");


	let witnessMemory = { type: "mem" }
	await wtns.calculate(zkCircuitInput, "./RollupValidator_js/RollupValidator.wasm", witnessMemory)
	const provingStartTime = Date.now();
	const zkProofResponse = await groth16.prove("./RollupValidator_js/rollupvalidator_final.zkey", witnessMemory)
	const provingEndTime = Date.now();
	performanceMetrics.batch.provingTime = provingEndTime - provingStartTime;
	console.log('Batch verifier proving time (ms):', performanceMetrics.batch.provingTime);
	let zkProofData = utils.stringifyBigInts(zkProofResponse.proof)
	fs.writeFileSync('batchproof.json', JSON.stringify(zkProofData));
	const proofFileStats = fs.statSync('batchproof.json');
	performanceMetrics.batch.proofSize = proofFileStats.size;
	console.log('Proof size for batch (bytes):', performanceMetrics.batch.proofSize);
	let publicOutputs = utils.unstringifyBigInts(zkProofResponse.publicSignals)

	// console.log("Solidity calldata:")
	// console.log(await groth16.exportSolidityCallData(zkProofData, publicOutputs))


	let verificationKeyData = JSON.parse(fs.readFileSync("./RollupValidator_js/verification_key.json"))

	const verificationStartTime = Date.now();
	const localVerificationResult = await groth16.verify(verificationKeyData, publicOutputs, zkProofData)
	const verificationEndTime = Date.now();
	performanceMetrics.batch.localVerificationTime = verificationEndTime - verificationStartTime;
	console.log('Batch local verification time (ms):', performanceMetrics.batch.localVerificationTime);

	console.log("Local verification response: " + localVerificationResult)

	// Submit batch update to the Rollup contract
	const submitStartTime = Date.now();
	let updateTransaction = await rollupContract.connect(primaryWallet).update(
		[zkProofData.pi_a[0], zkProofData.pi_a[1]],
		[[zkProofData.pi_b[0][1], zkProofData.pi_b[0][0]], [zkProofData.pi_b[1][1], zkProofData.pi_b[1][0]]],
		[zkProofData.pi_c[0], zkProofData.pi_c[1]],
		zkCircuitInput.transactionRoot, zkCircuitInput.initialStateRoot, zkCircuitInput.finalStateRoot,
		{ gasLimit: 1000000 }
	)

	let transactionReceipt = await updateTransaction.wait()
	const submitEndTime = Date.now();
	performanceMetrics.batch.onchainVerificationTime = submitEndTime - submitStartTime;
	performanceMetrics.batch.gasUsed = Number(transactionReceipt.gasUsed);
	console.log('Onchain batch verification time (ms):', performanceMetrics.batch.onchainVerificationTime);
	console.log('Gas used:', performanceMetrics.batch.gasUsed);

	console.log(updateTransaction)
	console.log(transactionReceipt)


	return [initialStateRoot, transactionRoot, finalStateRoot]
}

async function processWithdrawal(transactionHash, transactionRoot, transactionSignature, senderPubkey, receiverPubkey, transferAmount) {
	let [
		withdrawalSiblings,
		withdrawalDirections,
	] = rollupSequencer.generateWithdrawalProof(transactionHash, transactionRoot)

	const withdrawalCircuitInput = {
		transactionHash: transactionHash,
		transactionRoot: transactionRoot,
		transactionSiblings: withdrawalSiblings,
		transactionDirections: withdrawalDirections,
		signature_R8: transactionSignature.R8,
		signature_S: transactionSignature.S,
		senderPublicKey: senderPubkey,
		receiverPublicKey: receiverPubkey,
		transfer_amount: transferAmount
	}

	let withdrawalInput = utils.stringifyBigInts(withdrawalCircuitInput)
	fs.writeFileSync("./ExitValidator_js/input.json", JSON.stringify(withdrawalInput, null, 2))
	// console.log(withdrawalCircuitInput)

	let withdrawalWitness = { type: "mem" }
	await wtns.calculate(withdrawalCircuitInput, "./ExitValidator_js/ExitValidator.wasm", withdrawalWitness)
	const withdrawProvingStart = Date.now();
	const withdrawProofResponse = await groth16.prove("./ExitValidator_js/exitvalidator_final.zkey", withdrawalWitness)
	const withdrawProvingEnd = Date.now();
	performanceMetrics.withdraw.provingTime = withdrawProvingEnd - withdrawProvingStart;
	console.log('Withdraw verifier proving time (ms):', performanceMetrics.withdraw.provingTime);

	let withdrawProofData = utils.stringifyBigInts(withdrawProofResponse.proof)
	fs.writeFileSync('withdrawproof.json', JSON.stringify(withdrawProofData));
	const withdrawProofStats = fs.statSync('withdrawproof.json');
	performanceMetrics.withdraw.proofSize = withdrawProofStats.size;
	console.log('Proof size for Withdraw (bytes):', performanceMetrics.withdraw.proofSize);
	let withdrawPublicOutputs = utils.unstringifyBigInts(withdrawProofResponse.publicSignals)


	// console.log("Solidity calldata:")
	// console.log(await groth16.exportSolidityCallData(withdrawProofData, withdrawPublicOutputs))



	let withdrawVerificationKey = JSON.parse(fs.readFileSync("./ExitValidator_js/verification_key.json"))
	const withdrawVerifyStart = Date.now();
	const withdrawVerificationResult = await groth16.verify(withdrawVerificationKey, withdrawPublicOutputs, withdrawProofData)
	const withdrawVerifyEnd = Date.now();
	performanceMetrics.withdraw.localVerificationTime = withdrawVerifyEnd - withdrawVerifyStart;
	console.log('Withdraw local verification time (ms):', performanceMetrics.withdraw.localVerificationTime);
	console.log("Local verification response: " + withdrawVerificationResult)

	// Submit withdrawal to the Rollup contract
	const withdrawSubmitStart = Date.now();
	let withdrawTransaction = await rollupContract.connect(primaryWallet).withdraw(
		[withdrawProofData.pi_a[0], withdrawProofData.pi_a[1]],
		[[withdrawProofData.pi_b[0][1], withdrawProofData.pi_b[0][0]], [withdrawProofData.pi_b[1][1], withdrawProofData.pi_b[1][0]]],
		[withdrawProofData.pi_c[0], withdrawProofData.pi_c[1]],
		"0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266", BigInt(transferAmount), transactionHash, transactionRoot,
		{ gasLimit: 1000000 }
	)

	let withdrawReceipt = await withdrawTransaction.wait()
	const withdrawSubmitEnd = Date.now();
	performanceMetrics.withdraw.onchainVerificationTime = withdrawSubmitEnd - withdrawSubmitStart;
	performanceMetrics.withdraw.gasUsed = Number(withdrawReceipt.gasUsed);
	console.log('Onchain withdraw verification time (ms):', performanceMetrics.withdraw.onchainVerificationTime);
	console.log('Gas used:', performanceMetrics.withdraw.gasUsed);

	console.log(withdrawTransaction)
	console.log(withdrawReceipt)
}

async function executeBenchmark() {
	// Log initial balance
	let initialBalance = await testTokenContract.balanceOf("0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266")
	console.log("=== INITIAL STATE ===")
	console.log("Initial ERC20 balance (wei):", initialBalance.toString())
	console.log("Initial ERC20 balance (tokens):", (Number(initialBalance) / 10 ** 18).toString())

	loadUserAccounts()
	await processDeposits()

	// Test failed transaction
	rollupSequencer.createSignedTransaction(userAccounts[0].privkey, userAccounts[0].pubkey, userAccounts[3].pubkey, 2)

	// rollupSequencer.createSignedTransaction(userAccounts[3].privkey, userAccounts[3].pubkey, userAccounts[5].pubkey, 3)
	// rollupSequencer.createSignedTransaction(userAccounts[2].privkey, userAccounts[2].pubkey, userAccounts[4].pubkey, 5)
	// rollupSequencer.createSignedTransaction(userAccounts[4].privkey, userAccounts[4].pubkey, userAccounts[0].pubkey, 5)
	const ACTIVE_ACCOUNTS = ROLLUP_CONFIG.ACTIVE_ACCOUNTS;
	const BATCH_SIZE = ROLLUP_CONFIG.BATCH_SIZE; // Configurable batch size for benchmarking
	const TRANSFER_AMOUNT = ROLLUP_CONFIG.TRANSFER_AMOUNT;
	console.log("Starting transaction batch generation");
	for (let i = 0; i < (BATCH_SIZE - 1); i++) {
		let senderIndex = 1 + (i % ACTIVE_ACCOUNTS); // Start from userAccounts[1]
		let receiverIndex = 1 + ((i + 1) % ACTIVE_ACCOUNTS);
		rollupSequencer.createSignedTransaction(
			userAccounts[senderIndex].privkey,
			userAccounts[senderIndex].pubkey,
			userAccounts[receiverIndex].pubkey,
			TRANSFER_AMOUNT
		);
	}

	// This transaction will be used for withdrawal testing (completes the batch)
	let [withdrawTxHash, withdrawTxSignature, withdrawTxIndex] = rollupSequencer.createSignedTransaction(userAccounts[4].privkey, userAccounts[4].pubkey, emptyPublicKey, 4)

	console.log("Transaction batch generation completed");
	console.log("Starting batch verification");
	console.log("=== BATCH PROCESS ===")
	let [previousRoot, batchRoot, currentRoot] = await verifyAndSubmitBatch()


	console.log("Batch verification completed");
	rollupSequencer.commitBatchAndReset()
	console.log("Starting withdrawal process");

	// Check balance before withdrawal
	let balanceBeforeWithdraw = await testTokenContract.balanceOf("0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266")
	console.log("=== WITHDRAWAL PROCESS ===")
	console.log("Balance before withdraw (wei):", balanceBeforeWithdraw.toString())
	console.log("Balance before withdraw (tokens):", (Number(balanceBeforeWithdraw) / 10 ** 18).toString())
	console.log("Withdrawing amount (raw units):", 4)

	await processWithdrawal(withdrawTxHash, batchRoot, withdrawTxSignature, userAccounts[4].pubkey, emptyPublicKey, 4)
	let finalBalance = await testTokenContract.balanceOf("0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266")

	// console.log("=== FINAL ANALYSIS ===")
	// Calculate expected balance: initial balance - total deposited + withdrawn amount
	let totalDeposited = userAccounts.reduce((sum, account) => sum + account.balance, 0)
	let withdrawnAmount = 4
	let expectedBalanceWei = BigInt(1000) * BigInt(10 ** 18) - BigInt(totalDeposited) + BigInt(withdrawnAmount)

	// console.log("ERC20 balance after withdraw (wei):", finalBalance.toString())
	// console.log("ERC20 balance after withdraw (tokens):", (Number(finalBalance) / 10 ** 18).toString())
	// console.log("Expected balance (wei):", expectedBalanceWei.toString())
	// console.log("Expected balance (tokens):", (Number(expectedBalanceWei) / 10 ** 18).toString())
	// console.log("Total deposited (raw units):", totalDeposited)
	// console.log("Withdrawn amount (raw units):", withdrawnAmount)
	// console.log("Balance difference from expected (wei):", (finalBalance - expectedBalanceWei).toString())
	// console.log("Balance difference from expected (tokens):", (Number(finalBalance - expectedBalanceWei) / 10 ** 18).toString())

	console.log("\n=== PERFORMANCE METRICS ===")
	console.log("\n📊 BATCH OPERATIONS:")
	console.log(`  • Proving Time: ${performanceMetrics.batch.provingTime}ms`)
	console.log(`  • Proof Size: ${performanceMetrics.batch.proofSize} bytes`)
	console.log(`  • Local Verification Time: ${performanceMetrics.batch.localVerificationTime}ms`)
	console.log(`  • Onchain Verification Time: ${performanceMetrics.batch.onchainVerificationTime}ms`)
	console.log(`  • Gas Used: ${performanceMetrics.batch.gasUsed.toLocaleString()}`)

	console.log("\n📊 WITHDRAWAL OPERATIONS:")
	console.log(`  • Proving Time: ${performanceMetrics.withdraw.provingTime}ms`)
	console.log(`  • Proof Size: ${performanceMetrics.withdraw.proofSize} bytes`)
	console.log(`  • Local Verification Time: ${performanceMetrics.withdraw.localVerificationTime}ms`)
	console.log(`  • Onchain Verification Time: ${performanceMetrics.withdraw.onchainVerificationTime}ms`)
	console.log(`  • Gas Used: ${performanceMetrics.withdraw.gasUsed.toLocaleString()}`)

	console.log("\n✅ ZK-ROLLUP EXECUTION COMPLETED SUCCESSFULLY!");
	console.log("════════════════════════════════════════════════════════════════");
	console.log("Benchmark execution completed!");
}

await executeBenchmark()
process.exit(0);