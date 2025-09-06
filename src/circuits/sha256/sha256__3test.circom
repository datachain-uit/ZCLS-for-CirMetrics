pragma circom 2.0.0;

include "../../node_modules/circomlib/circuits/sha256/sha256.circom";

template Main() {
    signal input in[3][8];      // 3 input blocks, mỗi block 8 bits
    signal output out[3][256];  // 3 output hashes, mỗi hash 256 bits

    component sha256[3];

    for (var i = 0; i < 3; i++) {
        sha256[i] = Sha256(8);
        sha256[i].in <== in[i];
        out[i] <== sha256[i].out;
    }
}

component main = Main();