import { StateTreeManager } from "./merkleStateManager.mjs"

export class TransactionSequencer {
    constructor(accountTreeDepth, transactionTreeDepth, poseidonHasher, eddsaVerifier) {
        this.accountTreeDepth = accountTreeDepth
        this.transactionTreeDepth = transactionTreeDepth

        this.poseidonHasher = poseidonHasher

        this.hashTwo = (a, b) => {
            return poseidonHasher.F.toObject(poseidonHasher([a, b]))
        }

        this.hashThree = (a, b, c) => {
            return poseidonHasher.F.toObject(poseidonHasher([a, b, c]))
        }

        this.hashFive = (a, b, c, d, e) => {
            return poseidonHasher.F.toObject(poseidonHasher([a, b, c, d, e]))
        }

        this.eddsaVerifier = eddsaVerifier

        this.accountStateTree = new StateTreeManager(accountTreeDepth, this.hashTwo)
        this.accountRegistry = new Map() // pubkey -> position in accountStateTree
        this.accountDatabase = [] // account high level information
        this.nextAccountIndex = 0

        this.transactionMerkleTree = new StateTreeManager(transactionTreeDepth, this.hashTwo)
        this.transactionRegistry = new Map() // txHash -> position in transactionMerkleTree
        this.transactionDatabase = [] // transfer high level information
        this.nextTransactionIndex = 0

        this.processedBatches = new Map() // txRoot -> some Transaction Tree

        this.allRoots = undefined
        this.sourceAccountProofs = []
        this.sourceAccountDirections = []

        this.destinationAccountProofs = []
        this.destinationAccountDirections = []

        this.activeTreeLevels = 0

        const zeroBuffer = Buffer.from("0000000000000000000000000000000000000000000000000000000000000000", 'hex')

        this.addDepositToQueue([zeroBuffer, zeroBuffer], 0)
    }

    createTransactionHash(senderPubkey, receiverPubkey, transferAmount) {
        return this.hashFive(
            senderPubkey[0],
            senderPubkey[1],
            receiverPubkey[0],
            receiverPubkey[1],
            transferAmount
        )
    }

    createTransactionSignature(privateKey, transactionHash) {
        let signature = this.eddsaVerifier.signPoseidon(privateKey, this.poseidonHasher.F.fromObject(transactionHash))

        signature.R8 = [
            this.poseidonHasher.F.toObject(signature.R8[0]),
            this.poseidonHasher.F.toObject(signature.R8[1])
        ]

        return signature
    }

    createSignedTransaction(senderPrivateKey, senderPubkey, receiverPubkey, transferAmount) {
        let transactionHash = this.createTransactionHash(senderPubkey, receiverPubkey, transferAmount)

        let transactionSignature = this.createTransactionSignature(senderPrivateKey, transactionHash)

        let transactionIndex = this.processTransfer(transactionSignature, transactionHash, senderPubkey, receiverPubkey, transferAmount)

        return [transactionHash, transactionSignature, transactionIndex]
    }

    addDepositToQueue(userPublicKey, depositAmount) {
        // Hash the accounts using the same procedure as the smart contract
        let accountHash = this.hashThree(userPublicKey[0], userPublicKey[1], depositAmount)

        this.accountStateTree.append(accountHash)

        this.accountRegistry.set(this.hashTwo(userPublicKey[0], userPublicKey[1]), this.nextAccountIndex++)
        this.accountDatabase.push({
            pubkey: userPublicKey,
            balance: depositAmount
        })
    }

    finalizeDeposits() {
        this.activeTreeLevels = Math.floor(Math.log2(this.accountStateTree.size()))

        this.currentRoot = this.accountStateTree.getNode(this.accountTreeDepth - this.activeTreeLevels, 0)

        this.allRoots = [this.currentRoot]
    }

    processTransfer(transactionSignature, transactionHash, senderPubkey, receiverPubkey, transferAmount) {
        if (this.currentRoot == undefined) {
            console.log("Pending deposits have not been processed")
            return
        }

        if (this.transactionMerkleTree.size() == (2 ** this.transactionTreeDepth)) {
            console.log("Batch is full, please update contract")
            return
        }

        let senderIndex = this.accountRegistry.get(this.hashTwo(senderPubkey[0], senderPubkey[1]))
        let receiverIndex = this.accountRegistry.get(this.hashTwo(receiverPubkey[0], receiverPubkey[1]))

        let senderAccount = this.accountDatabase[senderIndex]
        let receiverAccount = this.accountDatabase[receiverIndex]

        if (transferAmount > senderAccount.balance) {
            console.log("Not enough balance on source account")
            return
        }

        let updatedSenderHash = this.hashThree(senderAccount.pubkey[0], senderAccount.pubkey[1], senderAccount.balance - transferAmount)
        let updatedReceiverHash = this.hashThree(receiverAccount.pubkey[0], receiverAccount.pubkey[1], receiverAccount.balance + transferAmount)

        let [initialRoot, senderSiblings, senderDirections] = this.accountStateTree.getLevelProof(senderIndex, this.accountTreeDepth - this.activeTreeLevels)
        console.assert(initialRoot == this.allRoots[this.allRoots.length - 1])

        this.accountStateTree.insert(senderIndex, updatedSenderHash, true) // Last parameter: update entry if it exists
        let [intermRoot, senderNewSiblings, senderNewDirections] = this.accountStateTree.getLevelProof(senderIndex, this.accountTreeDepth - this.activeTreeLevels)

        this.accountStateTree.insert(receiverIndex, updatedReceiverHash, true) // Last parameter: update entry if it exists
        let [finalRoot, receiverSiblings, receiverDirections] = this.accountStateTree.getLevelProof(receiverIndex, this.accountTreeDepth - this.activeTreeLevels)

        this.transactionMerkleTree.append(transactionHash)

        this.transactionRegistry.set(transactionHash, this.nextTransactionIndex++)
        this.transactionDatabase.push({
            transactionSignature,
            pubkey1: senderPubkey,
            balance1: senderAccount.balance,
            pubkey2: receiverPubkey,
            balance2: receiverAccount.balance,
            transfer_amount: transferAmount
        })

        this.allRoots.push(intermRoot)
        this.allRoots.push(finalRoot)

        this.sourceAccountProofs.push(senderNewSiblings)
        this.sourceAccountDirections.push(senderNewDirections)

        this.destinationAccountProofs.push(receiverSiblings)
        this.destinationAccountDirections.push(receiverDirections)

        // Make sure to update balances for next transaction
        senderAccount.balance -= transferAmount
        receiverAccount.balance += transferAmount

        return this.nextTransactionIndex
    }

    commitBatchAndReset() {
        this.processedBatches.set(this.transactionMerkleTree.getRoot(), this.transactionMerkleTree)
        // TODO: transactionMerkleTree.compact()

        this.transactionMerkleTree = new StateTreeManager(this.transactionTreeDepth, this.hashTwo)
        this.transactionDatabase = []
        this.nextTransactionIndex = 0

        let currentRoot = this.accountStateTree.getNode(this.accountTreeDepth - this.activeTreeLevels, 0)

        this.allRoots = [currentRoot]
        this.sourceAccountProofs = []
        this.sourceAccountDirections = []

        this.destinationAccountProofs = []
        this.destinationAccountDirections = []
    }

    generateBatchProof() {
        if (this.transactionMerkleTree.size() != (2 ** this.transactionTreeDepth)) {
            console.log("Batch is not full, please perform more transactions")
            return
        }

        let [transactionRoot, _txSiblings, _txDirections] = this.transactionMerkleTree.getProof(0)

        let allTransactionSiblings = []
        let allTransactionDirections = []

        for (var i = 0; i < this.transactionMerkleTree.size(); i++) {
            let [iTxRoot, iTxSiblings, iTxDirections] = this.transactionMerkleTree.getProof(i)

            allTransactionSiblings.push(iTxSiblings)
            allTransactionDirections.push(iTxDirections)
        }

        let allSignaturePoints = []
        let allSignatureScalars = []
        let allSenderPublicKeys = []
        let allSenderBalances = []
        let allReceiverPublicKeys = []
        let allReceiverBalances = []
        let allTransferAmounts = []

        for (var i = 0; i < this.transactionDatabase.length; i++) {
            allSignaturePoints.push(this.transactionDatabase[i].transactionSignature.R8)
            allSignatureScalars.push(this.transactionDatabase[i].transactionSignature.S)
            allSenderPublicKeys.push(this.transactionDatabase[i].pubkey1)
            allSenderBalances.push(this.transactionDatabase[i].balance1)
            allReceiverPublicKeys.push(this.transactionDatabase[i].pubkey2)
            allReceiverBalances.push(this.transactionDatabase[i].balance2)
            allTransferAmounts.push(this.transactionDatabase[i].transfer_amount)
        }

        let initialStateRoot = this.allRoots[0]
        let finalStateRoot = this.allRoots[this.allRoots.length - 1]

        return [
            transactionRoot,
            allTransactionSiblings,
            allTransactionDirections,
            allSignaturePoints,
            allSignatureScalars,
            allSenderPublicKeys,
            allSenderBalances,
            allReceiverPublicKeys,
            allReceiverBalances,
            this.sourceAccountProofs,
            this.sourceAccountDirections,
            this.destinationAccountProofs,
            this.destinationAccountDirections,
            allTransferAmounts,
            this.allRoots,
            initialStateRoot,
            finalStateRoot
        ]
    }

    generateWithdrawalProof(transactionHash, transactionRoot) {
        let txIndex = this.transactionRegistry.get(transactionHash)
        let committedTree = this.processedBatches.get(transactionRoot)

        let [root, siblings, directions] = committedTree.getProof(txIndex)

        console.assert(transactionRoot == root)

        return [siblings, directions]
    }
}