pragma circom 2.0.0;

include "../../node_modules/circomlib/circuits/sha256/sha256.circom";

template Main() {
    signal input in[33][8];      // 33 input blocks, mỗi block 8 bits
    signal output out[33][256];  // 33 output hashes, mỗi hash 256 bits

    component sha256[33];

    // Tạo components và gán inputs
    for (var i = 0; i < 33; i++) {
        sha256[i] = Sha256(8);
        sha256[i].in <== in[i];
    }

    // Đọc outputs sau khi đã gán hết inputs
    for (var i = 0; i < 33; i++) {
        out[i] <== sha256[i].out;
    }
}

component main = Main();