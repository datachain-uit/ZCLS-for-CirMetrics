# ZCLS-for-CirMetrics

This repository contains the **research implementation** used in our research paper: **"ZCLS: A Lifecycle Strategy for Efficient ZK-Rollup Circuit Optimization in Circom"**. 

The codebase includes a minimal, educational implementation of a ZK-Rollup system on Ethereum, along with CirMetrics — a supporting tool designed to monitor and analyze circuit performance metrics during development. This setup enables reproducibility of our experimental results and facilitates further research in ZK circuit optimization.

[Watch the demo video of CirMetrics](https://youtu.be/a_X8ZK8VE98) in action to see how the tool visualizes constraint counts, compilation times, and proof generation metrics across different optimization levels.

## 🔬 Key Research Contributions

**ZCLS (ZK Circuit Lifecycle Strategy)**: A practical, stage-aware framework for selecting Circom compiler optimization flags (-O0, -O1, -O2) based on development phase, update frequency, and proof generation volume. ZCLS helps developers balance compilation speed and proving efficiency throughout the circuit lifecycle.

**Performance Trade-off Analysis**: Empirical evaluation on ZK-Rollup circuits demonstrates that -O2 reduces constraints by up to 73.2% and proving time by 64.3%, but increases compilation time by 162.75% at batch size 64. This highlights a critical trade-off between development speed and proving efficiency.

**CirMetrics Tool**: A comprehensive tool for analyzing and visualizing circuit metrics (constraints, time, memory), circuit update frequency, and proof generation volume, enabling data-driven decisions when applying ZCLS.

## 📋 Table of Contents

- [Project Overview](#project-overview)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
- [Usage](#usage)
  - [ZK-Rollup Benchmark](#zk-rollup-benchmark)
  - [CirMetrics](#cirmetrics)
- [Configuration](#configuration)
- [Performance Metrics](#performance-metrics)
- [Project Structure](#project-structure)
- [Additional Documentation](#additional-documentation)
<!-- - [Contributor](#contributor) -->

## Project Overview

### ZK-Rollup Implementation

The ZK-Rollup implementation provides:

- **Batch Processing**: Transaction batching with configurable batch sizes
- **Zero-Knowledge Proofs**: Groth16-based proving system for transaction validity
- **Merkle Tree State Management**: Optimized state transitions using Poseidon hash
- **Smart Contract Integration**: Ethereum L1 verification and settlement
- **Withdrawal Mechanism**: Secure asset withdrawal with ZK proof verification

### CirMetrics Application

CirMetrics provides the following functionality:

- Extracts and analyzes circuit metrics from user-uploaded Circom circuits and associated compilation/proving logs, including constraint counts (linear/non-linear), compilation time, and proof generation time
- Visualizes performance trade-offs across optimization levels (-O0, -O1, -O2), enabling comparative analysis of circuit efficiency and resource usage
- Supports optimization decisions in ZCLS by providing data-driven insights based on circuit update frequency and proof generation volume, helping developers select the most suitable optimization strategy for their development stage

<a id="getting-started"></a>

## 🚀 Getting Started 

### Prerequisites

Before setting up the project, ensure you have the following installed:

**System Requirements:**
- Node.js v20 or higher
- Git
- Linux/macOS (Windows with WSL2)

**Memory Requirements:**
- 32GB+ RAM for maximum batch size of 64

<a id="installation"></a>

### 📦 Installation

1. **Clone the Repository**

   ```bash
   git clone https://github.com/datachain-uit/ZCLS-for-CirMetrics
   cd ZCLS-for-CirMetrics
   ```

2. **Install Dependencies**

   ```bash
   cd src
   npm install
   ```

3. **Install Rust and Circom**

   ```bash
   # Ubuntu/Debian
   curl --proto '=https' --tlsv1.2 https://sh.rustup.rs -sSf | sh
   git clone https://github.com/iden3/circom.git
   cd circom
   cargo build --release
   cargo install --path circom
   ```

4. **Verify Installation**

   ```bash
   circom --version
   node --version
   rustc --version
   ```

<a id="usage"></a>

## 💻 Usage

### ZK-Rollup Benchmark

Follow the workflow below to run and benchmark the ZK-Rollup with Groth16 and batch size 4. You can configure the batch size and ZKP scheme later using the [Configuration](#configuration) section. All steps from now on should be executed from the `src` directory:

#### Step 1: ⚡ ZK Circuit Setup

**Generate Powers of Tau for Trusted Setup**
> **Note**: Instead of generating manually, you can download a pre-generated `.ptau` file from [SNARKJS](https://github.com/iden3/snarkjs) to save time. Ensure the `.ptau` file size supports your circuit's constraint count (e.g., `pot16_final.ptau` supports up to 2¹⁶ constraints). Save the `.ptau` file in `src/ptau` as `potXX_final.ptau` with XX as the power of two for compatibility. The example batch size is set to 4 with maximum constraints of 213,846, so `pot19_final.ptau` is sufficient.

```bash
sh -x scripts/setup1-powersoftau.sh
```

<!-- You can specify the size of the Powers of Tau (PoT) file by adding a size parameter at the end of the command. For example, to create a pot20_final.ptau file, use the following command: `sh -x scripts/setup1-powersoftau.sh 20`  -->

**Compile Circuits and Generate Verification Artifacts**

You can configure the optimization level and observe circuit compilation metrics through this step (see [Configuration](#configuration)):

```bash
sh -x scripts/setup2-circuit-compilation.sh RollupValidator
sh -x scripts/setup2-circuit-compilation.sh ExitValidator
```

**Export Solidity Verifier Contracts**

```bash
# Export RollupValidator
cd RollupValidator_js
snarkjs zkey export solidityverifier rollupvalidator_final.zkey ../contracts/RollupValidator.sol
cd ..

# Export ExitValidator  
cd ExitValidator_js
snarkjs zkey export solidityverifier exitvalidator_final.zkey ../contracts/ExitValidator.sol
cd ..
```

> **Important**: Edit the exported Solidity files to rename contract classes to exactly `"RollupValidator"` and `"ExitValidator"`. The default names may be something like `"Groth16Verifier"`.

#### Step 2: 📄 Contract Preparation

**Generate Poseidon Hash Contracts**

```bash
node scripts/poseidonGenerator.mjs
```

**Compile Smart Contracts**

```bash
npx hardhat compile
```

#### Step 3: 🌐 Network Deployment and ZK-Rollup Execution

**Launch Local Blockchain (separate terminal)**

```bash
npx hardhat node
```

**Deploy Smart Contracts and Execute ZK-Rollup**

**Option 1: Automated Running (Recommended)**

```bash
npm run dev
```

This command automatically:
- Resets the Hardhat network
- Deploys fresh contracts  
- Executes the ZK-Rollup simulation

Use this command to rerun the ZK-Rollup subsequent times (with the Hardhat node running).

**Option 2: Manual Running**

Deploy contracts:
```bash
npx hardhat run scripts/deploy.mjs --network localhost
```

Run the simulation:
```bash
npx hardhat run app.mjs --network localhost
```

**ZK-Rollup Operation Flow:**

1. **Setup Phase**: Creates user accounts with predefined balances
2. **Deposit Phase**: Deposits tokens to L2 via L1 contract
3. **Transaction Phase**: Processes batch transfers between accounts
4. **Proving Phase**: Generates ZK proofs for transaction validity
5. **Verification Phase**: Verifies proofs and updates L1 state
6. **Withdrawal Phase**: Demonstrates secure asset withdrawal

<a id="cirmetrics"></a>

### 📊 CirMetrics

The `srcDemo/` directory contains CirMetrics source code, including frontend and backend:

#### Step 1: Install frontend packages

```bash
cd src/srcDemo/Frontend 
npm i
npm run dev
```

#### Step 2: Install backend packages and download ptau file

Download pot19 ptau file (save as pot19_final.ptau in src/srcDemo/Backend/src/ptau) from [SNARKJS](https://github.com/iden3/snarkjs) for small circuits testing, then run commands below:

```bash
cd src/srcDemo/Backend/src
npm i
node app.js
```

- Backend runs on port 5002
- Frontend runs on port 5173

<a id="configuration"></a>

## ⚙️ Configuration

### Batch Size Configuration

For modifying the ZK-Rollup batch size, configuration changes are required in both the circuits and main application file, followed by complete system recompilation.

#### Step 1: Application Configuration

Modify the `ROLLUP_CONFIG` object in `app.mjs`:

```javascript
const ROLLUP_CONFIG = {
    TRANSACTION_TREE_DEPTH: 2,  // Max 2^2 = 4 transactions per batch
}
```

#### Step 2: Circuit Configuration

For different batch sizes, update circuit parameters:

**Edit Circuit Files**
```circom
// circuits/RollupValidator.circom
component main { public [ transactionRoot, initialStateRoot, finalStateRoot ] } 
= RollupValidator(8, 2);  // (accountDepth, transactionDepth)
```

**Recompile ZK Circuits** (follow the circuit compilation step)

> **Note**: Configure the ptau file in scripts2 according to your batch size. Larger batch sizes require more constraints and correspondingly larger ptau files.

### Optimization Levels

Control circuit optimization during compilation:

```bash
# No optimization (faster compilation, larger constraints)
sh -x scripts/setup2-circuit-compilation.sh RollupValidator o0

# Default optimization  
sh -x scripts/setup2-circuit-compilation.sh RollupValidator
# or
sh -x scripts/setup2-circuit-compilation.sh RollupValidator o1

# Maximum optimization (slower compilation, fewer constraints)
sh -x scripts/setup2-circuit-compilation.sh RollupValidator o2
```

### Memory Configuration

For larger batch sizes, increase Node.js memory allocation:

```bash
# For batch sizes 64-128
export NODE_OPTIONS="--max-old-space-size=8192"

# For batch sizes 128+ use space size of 16384 or higher
export NODE_OPTIONS="--max-old-space-size=16384"
```
<a id="performance-metrics"></a>

### Additional Configuration
Additional configurations are available in the setup scripts located in the `src/scripts/` folder, including:
- ZKP scheme selection (Groth16/PLONK) for compilation and proving
- PTAU size configuration for ceremony generation and circuit compilation  
- Optimization levels and other advanced parameters

## 📈 Performance Metrics

The application automatically tracks and displays comprehensive performance metrics for batch processing and withdrawal operations:

### Batch Processing Metrics
- **Proving Time**: Circuit proof creation time
- **Proof Size**: Generated proof file size in bytes
- **Local Verification Time**: Local proof verification duration
- **Onchain Verification Time**: L1 contract verification duration
- **Gas Usage**: L1 transaction gas consumption

### Withdrawal Metrics
- **Withdrawal Proving Time**: Exit proof generation time
- **Withdrawal Verification Time**: Exit proof verification time
- **Withdrawal Gas Usage**: Gas cost for withdrawal transactions

### Circuit Compilation Metrics

Circuit compilation metrics can be observed during the circuit compilation phase:
### Compilation Metrics
- **Constraint Count**: Total number of constraints (linear and non-linear) — a key indicator of circuit complexity and proving cost
- **Compilation Time**: Time to compile high-level circuit to R1CS; critical for development speed and iteration efficiency

### Sample Output for Batch and Withdrawal Operations

```
=== PERFORMANCE ANALYSIS ===
📊 BATCH OPERATIONS:
  • Proving Time: 12,126ms
  • Proof Size: 725 bytes
  • Local Verification Time: 30ms
  • Onchain Verification Time: 81ms
  • Gas Used: 282,146

📊 WITHDRAWAL OPERATIONS:
  • Proving Time: 460ms
  • Proof Size: 722 bytes
  • Local Verification Time: 20ms
  • Onchain Verification Time: 75ms
  • Gas Used: 288,079
```
<a id="project-structure"></a>

## 🗂️ Project Structure
<!-- ├── LaTex-paper/                # LaTeX research paper source -->
```
zk-rollup-clone/
├── submission/                 # Submission notes and documentation
├── src/                        # Main source code directory
│   ├── circuits/               # Circom circuit implementations
│   ├── contracts/              # Solidity smart contracts
│   ├── scripts/                # Setup and utility scripts
│   ├── srcDemo/                # Demo applications and examples
│   │   ├── Backend/            # CirMetrics Backend
│   │   └── Frontend/           # CirMetrics Frontend
│   ├── videoDemo/              # Video demo for CirMetrics
│   ├── app.mjs                 # Main application entry point
│   ├── transactionSequencer.mjs # Transaction batching logic
│   ├── merkleStateManager.mjs  # Merkle tree state management
│   ├── ethereumConnector.mjs   # Blockchain interaction utilities
│   └── package.json            # Project dependencies and scripts
├── README.md                   # Main documentation
└── .gitignore                  # Git ignore patterns
```
<a id="additional-documentation"></a>

## 📚 Additional Documentation

### Research Papers
- **Project Paper**: This project paper will be updated soon.
- **Submission Notes**: `submission/note.md`

### External Resources
- [Circom Documentation](https://docs.circom.io/) - Official documentation for Circom, the domain-specific language used to design arithmetic circuits for zero-knowledge proofs.
- [snarkjs Guide](https://github.com/iden3/snarkjs) - JavaScript library for generating and verifying zk-SNARK proofs (Groth16, PLONK) with Circom integration.
- [ZK-Rollup Research](https://ethereum.org/en/developers/docs/scaling/zk-rollups/) - Comprehensive overview of ZK-Rollup technology, including architecture, data availability, and security on Ethereum.
- [Original ZK-Rollup Implementation](https://github.com/hammurabi-mendes/zk-rollup) - Educational foundation by Hammurabi Mendes
---

## 👥 Contributor
- 👑 Leader: M.Sc. IT. Võ Tấn Khoa  
- 👨‍💻 Members: Ngô Võ Quang Minh
