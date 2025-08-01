```
backend/
├── src/
│   ├── app.js                    # Main application entry point
│   ├── circuits/                 # .circom circuit files
│   ├── inputs/                   # .json input files for circuits
│   ├── outputs/                  # Compilation and proving results
│   │   └── {version_hash}/
│   │       ├── {version_hash}.circom
│   │       ├── {version_hash}.r1cs
│   │       ├── verification_key.json
│   │       ├── compile.log
│   │       └── {version_hash}_js/...
│   ├── scripts/
│   │   ├── snark2.sh            # Compile + verification key generation
│   │   └── snark3.sh            # Proving + timing
│   ├── database/
│   │   └── db.js                # SQLite schema & initialization
│   ├── models/
│   │   ├── circuitsModel.js
│   │   └── resultsModel.js
│   ├── controllers/
│   │   └── circuitsController.js
│   ├── routes/
│   │   └── circuitsRoute.js
│   └── ptau/                    # Powers of tau ceremony files
├── package.json                 # Project dependencies and scripts
└── readme.md                   # This documentation
```