export default [
    {
        inputs: [],
        stateMutability: "nonpayable",
        type: "constructor",
    },
    {
        inputs: [],
        name: "ECDSAInvalidSignature",
        type: "error",
    },
    {
        inputs: [
            {
                internalType: "uint256",
                name: "length",
                type: "uint256",
            },
        ],
        name: "ECDSAInvalidSignatureLength",
        type: "error",
    },
    {
        inputs: [
            {
                internalType: "bytes32",
                name: "s",
                type: "bytes32",
            },
        ],
        name: "ECDSAInvalidSignatureS",
        type: "error",
    },
    {
        inputs: [
            {
                internalType: "address",
                name: "owner",
                type: "address",
            },
        ],
        name: "OwnableInvalidOwner",
        type: "error",
    },
    {
        inputs: [
            {
                internalType: "address",
                name: "account",
                type: "address",
            },
        ],
        name: "OwnableUnauthorizedAccount",
        type: "error",
    },
    {
        anonymous: false,
        inputs: [
            {
                components: [
                    {
                        internalType: "uint32",
                        name: "id",
                        type: "uint32",
                    },
                    {
                        internalType: "uint32",
                        name: "timestampStart",
                        type: "uint32",
                    },
                    {
                        internalType: "uint32",
                        name: "timestampEnd",
                        type: "uint32",
                    },
                    {
                        components: [
                            {
                                internalType: "address",
                                name: "addr",
                                type: "address",
                            },
                            {
                                internalType: "string",
                                name: "host",
                                type: "string",
                            },
                        ],
                        internalType: "struct Verifier.Witness[]",
                        name: "witnesses",
                        type: "tuple[]",
                    },
                    {
                        internalType: "uint8",
                        name: "minimumWitnessesForClaimCreation",
                        type: "uint8",
                    },
                ],
                indexed: false,
                internalType: "struct Verifier.Epoch",
                name: "epoch",
                type: "tuple",
            },
        ],
        name: "EpochAdded",
        type: "event",
    },
    {
        anonymous: false,
        inputs: [
            {
                indexed: true,
                internalType: "address",
                name: "previousOwner",
                type: "address",
            },
            {
                indexed: true,
                internalType: "address",
                name: "newOwner",
                type: "address",
            },
        ],
        name: "OwnershipTransferred",
        type: "event",
    },
    {
        anonymous: false,
        inputs: [
            {
                indexed: true,
                internalType: "bytes32",
                name: "proofHash",
                type: "bytes32",
            },
            {
                indexed: true,
                internalType: "address",
                name: "owner",
                type: "address",
            },
            {
                indexed: false,
                internalType: "string",
                name: "model",
                type: "string",
            },
            {
                indexed: false,
                internalType: "uint32",
                name: "timestamp",
                type: "uint32",
            },
        ],
        name: "ProofAdded",
        type: "event",
    },
    {
        inputs: [
            {
                components: [
                    {
                        internalType: "address",
                        name: "addr",
                        type: "address",
                    },
                    {
                        internalType: "string",
                        name: "host",
                        type: "string",
                    },
                ],
                internalType: "struct Verifier.Witness[]",
                name: "witnesses",
                type: "tuple[]",
            },
            {
                internalType: "uint8",
                name: "requisiteWitnessesForClaimCreate",
                type: "uint8",
            },
        ],
        name: "addNewEpoch",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function",
    },
    {
        inputs: [
            {
                components: [
                    {
                        components: [
                            {
                                internalType: "string",
                                name: "provider",
                                type: "string",
                            },
                            {
                                internalType: "string",
                                name: "parameters",
                                type: "string",
                            },
                            {
                                internalType: "string",
                                name: "context",
                                type: "string",
                            },
                        ],
                        internalType: "struct Claims.ClaimInfo",
                        name: "claimInfo",
                        type: "tuple",
                    },
                    {
                        components: [
                            {
                                components: [
                                    {
                                        internalType: "bytes32",
                                        name: "identifier",
                                        type: "bytes32",
                                    },
                                    {
                                        internalType: "address",
                                        name: "owner",
                                        type: "address",
                                    },
                                    {
                                        internalType: "uint32",
                                        name: "timestampS",
                                        type: "uint32",
                                    },
                                    {
                                        internalType: "uint32",
                                        name: "epoch",
                                        type: "uint32",
                                    },
                                ],
                                internalType: "struct Claims.CompleteClaimData",
                                name: "claim",
                                type: "tuple",
                            },
                            {
                                internalType: "bytes[]",
                                name: "signatures",
                                type: "bytes[]",
                            },
                        ],
                        internalType: "struct Claims.SignedClaim",
                        name: "signedClaim",
                        type: "tuple",
                    },
                ],
                internalType: "struct Verifier.Proof",
                name: "proof",
                type: "tuple",
            },
        ],
        name: "addProof",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function",
    },
    {
        inputs: [],
        name: "currentEpoch",
        outputs: [
            {
                internalType: "uint32",
                name: "",
                type: "uint32",
            },
        ],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [],
        name: "epochDurationS",
        outputs: [
            {
                internalType: "uint32",
                name: "",
                type: "uint32",
            },
        ],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [
            {
                internalType: "uint256",
                name: "",
                type: "uint256",
            },
        ],
        name: "epochs",
        outputs: [
            {
                internalType: "uint32",
                name: "id",
                type: "uint32",
            },
            {
                internalType: "uint32",
                name: "timestampStart",
                type: "uint32",
            },
            {
                internalType: "uint32",
                name: "timestampEnd",
                type: "uint32",
            },
            {
                internalType: "uint8",
                name: "minimumWitnessesForClaimCreation",
                type: "uint8",
            },
        ],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [
            {
                internalType: "string",
                name: "data",
                type: "string",
            },
            {
                internalType: "string",
                name: "target",
                type: "string",
            },
        ],
        name: "extractField",
        outputs: [
            {
                internalType: "string",
                name: "",
                type: "string",
            },
        ],
        stateMutability: "pure",
        type: "function",
    },
    {
        inputs: [
            {
                internalType: "uint32",
                name: "epoch",
                type: "uint32",
            },
        ],
        name: "fetchEpoch",
        outputs: [
            {
                components: [
                    {
                        internalType: "uint32",
                        name: "id",
                        type: "uint32",
                    },
                    {
                        internalType: "uint32",
                        name: "timestampStart",
                        type: "uint32",
                    },
                    {
                        internalType: "uint32",
                        name: "timestampEnd",
                        type: "uint32",
                    },
                    {
                        components: [
                            {
                                internalType: "address",
                                name: "addr",
                                type: "address",
                            },
                            {
                                internalType: "string",
                                name: "host",
                                type: "string",
                            },
                        ],
                        internalType: "struct Verifier.Witness[]",
                        name: "witnesses",
                        type: "tuple[]",
                    },
                    {
                        internalType: "uint8",
                        name: "minimumWitnessesForClaimCreation",
                        type: "uint8",
                    },
                ],
                internalType: "struct Verifier.Epoch",
                name: "",
                type: "tuple",
            },
        ],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [
            {
                internalType: "uint32",
                name: "epoch",
                type: "uint32",
            },
            {
                internalType: "bytes32",
                name: "identifier",
                type: "bytes32",
            },
            {
                internalType: "uint32",
                name: "timestampS",
                type: "uint32",
            },
        ],
        name: "fetchWitnessesForClaim",
        outputs: [
            {
                components: [
                    {
                        internalType: "address",
                        name: "addr",
                        type: "address",
                    },
                    {
                        internalType: "string",
                        name: "host",
                        type: "string",
                    },
                ],
                internalType: "struct Verifier.Witness[]",
                name: "",
                type: "tuple[]",
            },
        ],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [
            {
                internalType: "bytes32",
                name: "proofHash",
                type: "bytes32",
            },
        ],
        name: "getLLMData",
        outputs: [
            {
                components: [
                    {
                        internalType: "string",
                        name: "model",
                        type: "string",
                    },
                    {
                        internalType: "string",
                        name: "prompt",
                        type: "string",
                    },
                    {
                        internalType: "string",
                        name: "response",
                        type: "string",
                    },
                ],
                internalType: "struct ProofContract.StoredLLMData",
                name: "",
                type: "tuple",
            },
        ],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [
            {
                internalType: "bytes32",
                name: "proofHash",
                type: "bytes32",
            },
        ],
        name: "getProof",
        outputs: [
            {
                components: [
                    {
                        components: [
                            {
                                internalType: "string",
                                name: "model",
                                type: "string",
                            },
                            {
                                internalType: "string",
                                name: "prompt",
                                type: "string",
                            },
                            {
                                internalType: "string",
                                name: "response",
                                type: "string",
                            },
                        ],
                        internalType: "struct ProofContract.StoredLLMData",
                        name: "llmData",
                        type: "tuple",
                    },
                    {
                        components: [
                            {
                                components: [
                                    {
                                        internalType: "bytes32",
                                        name: "identifier",
                                        type: "bytes32",
                                    },
                                    {
                                        internalType: "address",
                                        name: "owner",
                                        type: "address",
                                    },
                                    {
                                        internalType: "uint32",
                                        name: "timestampS",
                                        type: "uint32",
                                    },
                                    {
                                        internalType: "uint32",
                                        name: "epoch",
                                        type: "uint32",
                                    },
                                ],
                                internalType: "struct Claims.CompleteClaimData",
                                name: "claim",
                                type: "tuple",
                            },
                            {
                                internalType: "bytes[]",
                                name: "signatures",
                                type: "bytes[]",
                            },
                        ],
                        internalType: "struct Claims.SignedClaim",
                        name: "signedClaim",
                        type: "tuple",
                    },
                ],
                internalType: "struct ProofContract.StoredProof",
                name: "",
                type: "tuple",
            },
        ],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [
            {
                components: [
                    {
                        components: [
                            {
                                internalType: "string",
                                name: "provider",
                                type: "string",
                            },
                            {
                                internalType: "string",
                                name: "parameters",
                                type: "string",
                            },
                            {
                                internalType: "string",
                                name: "context",
                                type: "string",
                            },
                        ],
                        internalType: "struct Claims.ClaimInfo",
                        name: "claimInfo",
                        type: "tuple",
                    },
                    {
                        components: [
                            {
                                components: [
                                    {
                                        internalType: "bytes32",
                                        name: "identifier",
                                        type: "bytes32",
                                    },
                                    {
                                        internalType: "address",
                                        name: "owner",
                                        type: "address",
                                    },
                                    {
                                        internalType: "uint32",
                                        name: "timestampS",
                                        type: "uint32",
                                    },
                                    {
                                        internalType: "uint32",
                                        name: "epoch",
                                        type: "uint32",
                                    },
                                ],
                                internalType: "struct Claims.CompleteClaimData",
                                name: "claim",
                                type: "tuple",
                            },
                            {
                                internalType: "bytes[]",
                                name: "signatures",
                                type: "bytes[]",
                            },
                        ],
                        internalType: "struct Claims.SignedClaim",
                        name: "signedClaim",
                        type: "tuple",
                    },
                ],
                internalType: "struct Verifier.Proof",
                name: "proof",
                type: "tuple",
            },
        ],
        name: "getProviderFromProof",
        outputs: [
            {
                internalType: "string",
                name: "",
                type: "string",
            },
        ],
        stateMutability: "pure",
        type: "function",
    },
    {
        inputs: [],
        name: "owner",
        outputs: [
            {
                internalType: "address",
                name: "",
                type: "address",
            },
        ],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [
            {
                internalType: "bytes32",
                name: "",
                type: "bytes32",
            },
        ],
        name: "proofs",
        outputs: [
            {
                components: [
                    {
                        internalType: "string",
                        name: "model",
                        type: "string",
                    },
                    {
                        internalType: "string",
                        name: "prompt",
                        type: "string",
                    },
                    {
                        internalType: "string",
                        name: "response",
                        type: "string",
                    },
                ],
                internalType: "struct ProofContract.StoredLLMData",
                name: "llmData",
                type: "tuple",
            },
            {
                components: [
                    {
                        components: [
                            {
                                internalType: "bytes32",
                                name: "identifier",
                                type: "bytes32",
                            },
                            {
                                internalType: "address",
                                name: "owner",
                                type: "address",
                            },
                            {
                                internalType: "uint32",
                                name: "timestampS",
                                type: "uint32",
                            },
                            {
                                internalType: "uint32",
                                name: "epoch",
                                type: "uint32",
                            },
                        ],
                        internalType: "struct Claims.CompleteClaimData",
                        name: "claim",
                        type: "tuple",
                    },
                    {
                        internalType: "bytes[]",
                        name: "signatures",
                        type: "bytes[]",
                    },
                ],
                internalType: "struct Claims.SignedClaim",
                name: "signedClaim",
                type: "tuple",
            },
        ],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [],
        name: "renounceOwnership",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function",
    },
    {
        inputs: [
            {
                internalType: "address",
                name: "newOwner",
                type: "address",
            },
        ],
        name: "transferOwnership",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function",
    },
    {
        inputs: [
            {
                components: [
                    {
                        components: [
                            {
                                internalType: "string",
                                name: "provider",
                                type: "string",
                            },
                            {
                                internalType: "string",
                                name: "parameters",
                                type: "string",
                            },
                            {
                                internalType: "string",
                                name: "context",
                                type: "string",
                            },
                        ],
                        internalType: "struct Claims.ClaimInfo",
                        name: "claimInfo",
                        type: "tuple",
                    },
                    {
                        components: [
                            {
                                components: [
                                    {
                                        internalType: "bytes32",
                                        name: "identifier",
                                        type: "bytes32",
                                    },
                                    {
                                        internalType: "address",
                                        name: "owner",
                                        type: "address",
                                    },
                                    {
                                        internalType: "uint32",
                                        name: "timestampS",
                                        type: "uint32",
                                    },
                                    {
                                        internalType: "uint32",
                                        name: "epoch",
                                        type: "uint32",
                                    },
                                ],
                                internalType: "struct Claims.CompleteClaimData",
                                name: "claim",
                                type: "tuple",
                            },
                            {
                                internalType: "bytes[]",
                                name: "signatures",
                                type: "bytes[]",
                            },
                        ],
                        internalType: "struct Claims.SignedClaim",
                        name: "signedClaim",
                        type: "tuple",
                    },
                ],
                internalType: "struct Verifier.Proof",
                name: "proof",
                type: "tuple",
            },
        ],
        name: "verifyProof",
        outputs: [],
        stateMutability: "view",
        type: "function",
    },
] as const;
