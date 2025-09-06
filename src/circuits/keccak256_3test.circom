pragma circom 2.0.0;

include "./keccak256/utils/keccak256.circom";

template Main() {
    signal input in[3][256];      // 3 input blocks, mỗi block 256 bits
    signal output out[3][256];    // 3 output hashes, mỗi hash 256 bits

    component keccak[3];

    for (var i = 0; i < 3; i++) {
        keccak[i] = Keccak(256, 256);
        for (var j = 0; j < 256; j++) {
            keccak[i].in[j] <== in[i][j];
            out[i][j] <== keccak[i].out[j];
        }
    }
}

component main = Main();