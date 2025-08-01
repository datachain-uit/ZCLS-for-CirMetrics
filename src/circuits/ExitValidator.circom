pragma circom 2.0.4;

include "../node_modules/circomlib/circuits/comparators.circom";

include "../node_modules/circomlib/circuits/eddsaposeidon.circom";
include "../node_modules/circomlib/circuits/poseidon.circom";

include "MerkleProofValidator.circom";

template ExitValidator(transactionTreeDepth) {
    signal input transactionHash;
    signal input transactionRoot;

	signal input transactionSiblings[transactionTreeDepth];
	signal input transactionDirections[transactionTreeDepth];

    signal input signature_R8[2];
    signal input signature_S;

    signal input senderPublicKey[2];
    signal input receiverPublicKey[2];

    signal input transfer_amount;

    // 1) Verify transaction validity: balance, signature, presence in transactionRoot
    component transactionHasher = Poseidon(5);

    transactionHasher.inputs[0] <== senderPublicKey[0];
    transactionHasher.inputs[1] <== senderPublicKey[1];
    transactionHasher.inputs[2] <== receiverPublicKey[0];
    transactionHasher.inputs[3] <== receiverPublicKey[1];
    transactionHasher.inputs[4] <== transfer_amount;

    transactionHasher.out === transactionHash;

    //  1.1) Verify that the recipient is the zero address
    receiverPublicKey[0] === 0;
    receiverPublicKey[1] === 0;

    //  1.2) Verify the transaction signature with EDDSA/Poseidon
    component signatureVerifier = EdDSAPoseidonVerifier();

    signatureVerifier.enabled <== 1;
    signatureVerifier.Ax <== senderPublicKey[0];
    signatureVerifier.Ay <== senderPublicKey[1];
    signatureVerifier.S <== signature_S;
    signatureVerifier.R8x <== signature_R8[0];
    signatureVerifier.R8y <== signature_R8[1];
    signatureVerifier.M <== transactionHasher.out;

    //  1.3) Verify that the transaction record exists in transactionRoot
    component txRootVerifier = MerkleProofValidator(transactionTreeDepth);

    txRootVerifier.root <== transactionRoot;
    txRootVerifier.element <== transactionHasher.out;

	for(var i = 0; i < transactionTreeDepth; i++) {
        txRootVerifier.siblings[i] <== transactionSiblings[i];
        txRootVerifier.isLeft[i] <== transactionDirections[i];
    }

    txRootVerifier.nLevelsUsed <== transactionTreeDepth;
}

component main { public [ transactionHash, transactionRoot, transfer_amount ] } = ExitValidator(2);