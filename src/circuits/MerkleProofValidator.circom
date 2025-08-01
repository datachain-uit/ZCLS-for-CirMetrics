pragma circom 2.0.4;

include "../node_modules/circomlib/circuits/switcher.circom";
include "../node_modules/circomlib/circuits/poseidon.circom";
include "../node_modules/circomlib/circuits/comparators.circom";

template MerkleProofValidator(treeDepth) {
	signal input root;
	signal input element;
	signal input siblings[treeDepth];
	signal input isLeft[treeDepth];

	signal input nLevelsUsed;

	component hashers[treeDepth];
	component switchers[treeDepth];

	// Used to select the hash to compare with the root
	component compareLevelRoot[treeDepth];
	component constraintLevelRoot[treeDepth];

	var current = element;

	for(var i = treeDepth - 1; i >= 0; i--) {
		switchers[i] = Switcher();
		switchers[i].sel <== (1 - isLeft[i]);
		switchers[i].L <== current;
		switchers[i].R <== siblings[i];

		hashers[i] = Poseidon(2);
		hashers[i].inputs[0] <== switchers[i].outL;
		hashers[i].inputs[1] <== switchers[i].outR;

		current = hashers[i].out;

		compareLevelRoot[i] = IsEqual();
		compareLevelRoot[i].in[0] <== (treeDepth - nLevelsUsed);
		compareLevelRoot[i].in[1] <== i;

		constraintLevelRoot[i] = ForceEqualIfEnabled();
		constraintLevelRoot[i].in[0] <== current;
		constraintLevelRoot[i].in[1] <== root;
		constraintLevelRoot[i].enabled <== compareLevelRoot[i].out;
	}

	// current === root;
}