pragma circom 2.0.4;

include "../node_modules/circomlib/circuits/comparators.circom";

include "../node_modules/circomlib/circuits/eddsaposeidon.circom";
include "../node_modules/circomlib/circuits/poseidon.circom";

include "MerkleProofValidator.circom";

template TxValidator(accountTreeDepth, transactionTreeDepth) {
    signal input transactionRoot;

	signal input transactionSiblings[transactionTreeDepth];
	signal input transactionDirections[transactionTreeDepth];

    signal input signature_R8[2];
    signal input signature_S;

    signal input senderPublicKey[2];
    signal input senderBalance;

    signal input receiverPublicKey[2];
    signal input receiverBalance;

    signal input transfer_amount;

	signal input senderAccountSiblings[accountTreeDepth];
	signal input senderAccountDirections[accountTreeDepth];

	signal input receiverAccountSiblings[accountTreeDepth];
	signal input receiverAccountDirections[accountTreeDepth];

    signal input initialStateRoot;
    signal input intermediateStateRoot;
    signal input finalStateRoot;

    signal input activeLevelsUsed;

    // 1) Verifies transaction validity: balance, signature, presence in transactionRoot
    component transactionHasher = Poseidon(5);

    transactionHasher.inputs[0] <== senderPublicKey[0];
    transactionHasher.inputs[1] <== senderPublicKey[1];
    transactionHasher.inputs[2] <== receiverPublicKey[0];
    transactionHasher.inputs[3] <== receiverPublicKey[1];
    transactionHasher.inputs[4] <== transfer_amount;

    //  1.1) Verify that the transfer amount is smaller than sender balance
    component validTransferVerifier = LessEqThan(252);

    validTransferVerifier.in[0] <== transfer_amount;
    validTransferVerifier.in[1] <== senderBalance;

    validTransferVerifier.out === 1;

    //  1.2) Verify the transaction signature with EDDSA/Poseidon
    component signatureVerifier = EdDSAPoseidonVerifier();

    signatureVerifier.enabled <== 1;
    signatureVerifier.Ax <== senderPublicKey[0];
    signatureVerifier.Ay <== senderPublicKey[1];
    signatureVerifier.S <== signature_S;
    signatureVerifier.R8x <== signature_R8[0];
    signatureVerifier.R8y <== signature_R8[1];
    signatureVerifier.M <== transactionHasher.out;

    //  1.3) Verifies that the transaction record exists in transactionRoot
    component txRootVerifier = MerkleProofValidator(transactionTreeDepth);

    txRootVerifier.root <== transactionRoot;
    txRootVerifier.element <== transactionHasher.out;

	for(var i = 0; i < transactionTreeDepth; i++) {
        txRootVerifier.siblings[i] <== transactionSiblings[i];
        txRootVerifier.isLeft[i] <== transactionDirections[i];
    }

    txRootVerifier.nLevelsUsed <== transactionTreeDepth;

    // 2) Verifies that the original sender record exists in the initialStateRoot

    //  2.1) Hash the old sender account
    component oldSenderLeafHasher = Poseidon(3);

    oldSenderLeafHasher.inputs[0] <== senderPublicKey[0];
    oldSenderLeafHasher.inputs[1] <== senderPublicKey[1];
    oldSenderLeafHasher.inputs[2] <== senderBalance;

    //  2.2) Verifies that the old sender exists in the initialStateRoot
    component oldRootVerifier = MerkleProofValidator(accountTreeDepth);

    oldRootVerifier.root <== initialStateRoot;
    oldRootVerifier.element <== oldSenderLeafHasher.out;

	for(var i = 0; i < accountTreeDepth; i++) {
        oldRootVerifier.siblings[i] <== senderAccountSiblings[i];
        oldRootVerifier.isLeft[i] <== senderAccountDirections[i];
    }
    
    oldRootVerifier.nLevelsUsed <== activeLevelsUsed;

    // 3) Verifies that the deducted sender record exists in the intermediateStateRoot

    //  3.1) Hash the mid sender account
    component midSenderLeafHasher = Poseidon(3);

    midSenderLeafHasher.inputs[0] <== senderPublicKey[0];
    midSenderLeafHasher.inputs[1] <== senderPublicKey[1];
    midSenderLeafHasher.inputs[2] <== senderBalance - transfer_amount;

    //  3.2) Verifies that the mid sender exists in the intermediateStateRoot
    component midRootVerifier1 = MerkleProofValidator(accountTreeDepth);

    midRootVerifier1.root <== intermediateStateRoot;
    midRootVerifier1.element <== midSenderLeafHasher.out;

	for(var i = 0; i < accountTreeDepth; i++) {
        midRootVerifier1.siblings[i] <== senderAccountSiblings[i];
        midRootVerifier1.isLeft[i] <== senderAccountDirections[i];
    }

    midRootVerifier1.nLevelsUsed <== activeLevelsUsed;

    // 4) Verifies that the original receiver record exists in the intermediateStateRoot

    //  4.1) Hash the old receiver account
    component oldReceiverLeafHasher = Poseidon(3);

    oldReceiverLeafHasher.inputs[0] <== receiverPublicKey[0];
    oldReceiverLeafHasher.inputs[1] <== receiverPublicKey[1];
    oldReceiverLeafHasher.inputs[2] <== receiverBalance;

    //  4.2) Verifies that the old receiver exists in the intermediateStateRoot
    component midRootVerifier2 = MerkleProofValidator(accountTreeDepth);

    midRootVerifier2.root <== intermediateStateRoot;
    midRootVerifier2.element <== oldReceiverLeafHasher.out;

	for(var i = 0; i < accountTreeDepth; i++) {
        midRootVerifier2.siblings[i] <== receiverAccountSiblings[i];
        midRootVerifier2.isLeft[i] <== receiverAccountDirections[i];
    }

    midRootVerifier2.nLevelsUsed <== activeLevelsUsed;

    // 5) Verifies that the credited receiver record exists in the finalStateRoot

    //  5.1) Hash the new receiver account
    component newReceiverLeafHasher = Poseidon(3);

    newReceiverLeafHasher.inputs[0] <== receiverPublicKey[0];
    newReceiverLeafHasher.inputs[1] <== receiverPublicKey[1];
    newReceiverLeafHasher.inputs[2] <== receiverBalance + transfer_amount;

    //  5.2) Verifies that the new receiver exists in the finalStateRoot
    component newRootVerifier = MerkleProofValidator(accountTreeDepth);

    newRootVerifier.root <== finalStateRoot;
    newRootVerifier.element <== newReceiverLeafHasher.out;

	for(var i = 0; i < accountTreeDepth; i++) {
        newRootVerifier.siblings[i] <== receiverAccountSiblings[i];
        newRootVerifier.isLeft[i] <== receiverAccountDirections[i];
    }

    newRootVerifier.nLevelsUsed <== activeLevelsUsed;
}