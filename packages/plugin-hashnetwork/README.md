# @elizaos/plugin-hashnetwork

A plugin for ElizaOS that enables verifiable inference proof generation using zkTLS technology and stored on Hash Network for transparent verification and tamper-proof record keeping.
This plugin enables the generation and verification of inference proofs for ElizaOS, both on-chain and off-chain - providing a robust mechanism to ensure the transparency and authenticity of AI-generated responses.

## Features

- Verifiable inference proof generation
- Integration with Reclaim Protocol's zkTLS
- Support for OpenAI API calls with proof verification
- On-chain proof storage and verification

## Configuration

Add the following environment variables to your `.env` file:

```env
# Required Configuration
HASH_NETWORK_PRIVATE_KEY=your_evm_private_key
HASH_NETWORK_PROOF_CONTRACT_ADDRESS=0x2f75543a465f0282f684Fd69b221563F93cA1943
VERIFIABLE_INFERENCE_ENABLED=true
```

### Environment Variables

- `HASH_NETWORK_PRIVATE_KEY`: Your EVM private key for signing transactions
- `HASH_NETWORK_PROOF_CONTRACT_ADDRESS`: The smart contract address for proof storage and verification
- `VERIFIABLE_INFERENCE_ENABLED`: Enable the proof generation

> **Note**: You'll need testnet tokens to store proofs on Hash Network. Get testnet funds from the [Hash Network Faucet](https://hash-testnet.hub.caldera.xyz/).

## How it Works

The plugin leverages Reclaim Protocol's zkTLS technology to generate cryptographic proofs of inference. Here's the process:

1. **Proof Generation**:

    - Uses Reclaim SDK with zkTLS to generate proofs of inference API calls
    - Proofs can be verified without making any additional API calls
    - Ensures the authenticity of the model's response

2. **Hash Network Integration**:
    - All proofs are stored on Hash Network
    - Hash Network acts as both storage and verification layer
    - Provides tamper-proof and non-fraudulent inference verification
    - Enables transparent tracking of model responses
