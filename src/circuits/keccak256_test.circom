pragma circom 2.0.0;

include "./keccak256/utils/keccak256.circom";

// Test Keccak256 hash cho 8 bit input, output 256 bit
template Main() {
    signal input in[256];         // 8 bits input
    signal output out[256];     // 256 bits output

    component keccak = Keccak(256, 256);

    for (var i = 0; i < 256; i++) {
        keccak.in[i] <== in[i];
    }
    for (var i = 0; i < 256; i++) {
        out[i] <== keccak.out[i];
    }
}

component main = Main();