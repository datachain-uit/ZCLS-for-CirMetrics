pragma circom 2.0.4;

include "TxValidator.circom";

template RollupValidator(accountTreeDepth, transactionTreeDepth) {
    signal input transactionRoot;

	signal input transactionSiblings[2 ** transactionTreeDepth][transactionTreeDepth];
	signal input transactionDirections[2 ** transactionTreeDepth][transactionTreeDepth];

    signal input signature_R8[2 ** transactionTreeDepth][2];
    signal input signature_S[2 ** transactionTreeDepth];

    signal input senderPublicKey[2 ** transactionTreeDepth][2];
    signal input senderBalance[2 ** transactionTreeDepth];

    signal input receiverPublicKey[2 ** transactionTreeDepth][2];
    signal input receiverBalance[2 ** transactionTreeDepth];

    signal input transfer_amount[2 ** transactionTreeDepth];

	signal input senderAccountSiblings[2 ** transactionTreeDepth][accountTreeDepth];
	signal input senderAccountDirections[2 ** transactionTreeDepth][accountTreeDepth];

	signal input receiverAccountSiblings[2 ** transactionTreeDepth][accountTreeDepth];
	signal input receiverAccountDirections[2 ** transactionTreeDepth][accountTreeDepth];

    signal input stateRootHistory[2 * (2 ** transactionTreeDepth) + 1];

    signal input initialStateRoot;
    signal input finalStateRoot;

    signal input activeLevelsUsed;

    // Ensure we start at initialStateRoot and finish at finalStateRoot
    stateRootHistory[0] === initialStateRoot;
    stateRootHistory[2 * (2 ** transactionTreeDepth)] === finalStateRoot;

    // For each transaction, verify it moves the state to the next root
    component transactionVerifier[2 ** transactionTreeDepth];

    for(var t = 0; t < (2 ** transactionTreeDepth); t++) {
        transactionVerifier[t] = TxValidator(accountTreeDepth, transactionTreeDepth);

        transactionVerifier[t].transactionRoot <== transactionRoot;

        for(var i = 0; i < transactionTreeDepth; i++) {
            transactionVerifier[t].transactionSiblings[i] <== transactionSiblings[t][i];
            transactionVerifier[t].transactionDirections[i] <== transactionDirections[t][i];
        }

        transactionVerifier[t].signature_R8[0] <== signature_R8[t][0];
        transactionVerifier[t].signature_R8[1] <== signature_R8[t][1];
        transactionVerifier[t].signature_S <== signature_S[t];

        transactionVerifier[t].senderPublicKey[0] <== senderPublicKey[t][0];
        transactionVerifier[t].senderPublicKey[1] <== senderPublicKey[t][1];
        transactionVerifier[t].senderBalance <== senderBalance[t];

        transactionVerifier[t].receiverPublicKey[0] <== receiverPublicKey[t][0];
        transactionVerifier[t].receiverPublicKey[1] <== receiverPublicKey[t][1];
        transactionVerifier[t].receiverBalance <== receiverBalance[t];

        transactionVerifier[t].transfer_amount <== transfer_amount[t];

        for(var i = 0; i < accountTreeDepth; i++) {
            transactionVerifier[t].senderAccountSiblings[i] <== senderAccountSiblings[t][i];
            transactionVerifier[t].senderAccountDirections[i] <== senderAccountDirections[t][i];

            transactionVerifier[t].receiverAccountSiblings[i] <== receiverAccountSiblings[t][i];
            transactionVerifier[t].receiverAccountDirections[i] <== receiverAccountDirections[t][i];
        }

        transactionVerifier[t].initialStateRoot <== stateRootHistory[2*t];
        transactionVerifier[t].intermediateStateRoot <== stateRootHistory[2*t + 1];
        transactionVerifier[t].finalStateRoot <== stateRootHistory[2*t + 2];

        transactionVerifier[t].activeLevelsUsed <== activeLevelsUsed;
    }
}

component main { public [ transactionRoot, initialStateRoot, finalStateRoot ] } = RollupValidator(8, 2);