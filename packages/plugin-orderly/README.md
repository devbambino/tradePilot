# @elizaos/plugin-orderly

Orderly Network integration plugin for Eliza OS that enables trading on the Orderly Network decentralized exchange platform.

## Overview

This plugin provides seamless integration with [Orderly Network](https://orderly.network/), a high-performance decentralized exchange platform. It enables users to perform various trading operations including deposits, withdrawals, order creation, and position management.

## Features

- Deposit funds to Orderly Network
- Withdraw funds from Orderly Network
- Create trading orders
- Close trading positions
- Multiple network support (mainnet, testnet)
- Secure transaction signing
- Comprehensive error handling

## Installation

```bash
pnpm install @elizaos/plugin-orderly
```

## Configuration

### Environment Variables

The plugin requires some common environment variables and additional chain-specific variables depending on your chosen chain mode.

#### Common Configuration
```env
# Core Orderly Configuration
ORDERLY_PRIVATE_KEY=           # Your private key for signing transactions (ed25519 format)
ORDERLY_BROKER_ID=demo         # Your broker ID (default: demo)
ORDERLY_NETWORK=testnet        # Network to connect to (testnet or mainnet)
ORDERLY_CHAIN_MODE=            # Chain mode to use (evm or solana)
```

You can generate your Orderly private key using the [Orderly Broker Registration Tool](https://orderlynetwork.github.io/broker-registration/). This tool will provide you with the necessary credentials to interact with the Orderly Network.

#### EVM Chain Configuration

If using `ORDERLY_CHAIN_MODE=evm`, set these variables:

```env
# EVM Configuration
EVM_PRIVATE_KEY=               # Your EVM wallet private key
EVM_PROVIDER_URL=              # Default RPC URL for mainnet (optional)

# RPC URLs for each chain you want to use
# Replace <chainname> with the uppercase chain name (e.g., ARBITRUMSEPOLIA, OPTIMISM, etc.)
ETHEREUM_PROVIDER_<chainname>=  # RPC URL for the specific chain

# Examples:
ETHEREUM_PROVIDER_ARBITRUMSEPOLIA=https://sepolia-rollup.arbitrum.io/rpc
ETHEREUM_PROVIDER_OPTIMISM=https://mainnet.optimism.io
ETHEREUM_PROVIDER_BASE=https://mainnet.base.org
```

For each EVM chain you specify in your character configuration, you must provide a corresponding RPC URL in the environment variables. The environment variable name should be `ETHEREUM_PROVIDER_` followed by the chain name in uppercase.

#### Solana Chain Configuration

If using `ORDERLY_CHAIN_MODE=solana`, set these variables:

```env
# Solana Configuration
SOLANA_PRIVATE_KEY=            # Your Solana wallet private key (base58 encoded)
```

The plugin will automatically:
- Derive your public key from the private key
- Use the appropriate Solana RPC endpoints based on your `ORDERLY_NETWORK` setting:
  - For `ORDERLY_NETWORK=mainnet`: https://api.mainnet-beta.solana.com
  - For `ORDERLY_NETWORK=testnet`: https://api.devnet.solana.com

### Character Configuration

In your character configuration file (e.g., `character.json`):

#### For EVM Mode
```json
{
    "settings": {
        "chains": {
            "evm": ["arbitrumSepolia"] // Array of supported EVM chains
        }
    }
}
```

#### For Solana Mode
No additional chain configuration is needed in the character file. The appropriate Solana network is automatically determined by your `ORDERLY_NETWORK` setting.

#### Supported Chains

**EVM Mainnet Chains** (`ORDERLY_NETWORK=mainnet`, `ORDERLY_CHAIN_MODE=evm`):
- `mainnet` (Ethereum)
- `arbitrum` (Arbitrum One)
- `optimism` (OP Mainnet)
- `base` (Base)
- `mantle` (Mantle)
- `sei` (Sei)
- `avalanche` (Avalanche)

**EVM Testnet Chains** (`ORDERLY_NETWORK=testnet`, `ORDERLY_CHAIN_MODE=evm`):
- `sepolia` (Sepolia)
- `arbitrumSepolia` (Arbitrum Sepolia)
- `optimismSepolia` (OP Sepolia)
- `baseSepolia` (Base Sepolia)
- `mantleSepoliaTestnet` (Mantle Sepolia)
- `seiDevnet` (Sei Devnet)
- `avalancheFuji` (Avalanche Fuji)

**Solana Chains** (`ORDERLY_CHAIN_MODE=solana`):
- When `ORDERLY_NETWORK=mainnet`: Uses Solana mainnet-beta
- When `ORDERLY_NETWORK=testnet`: Uses Solana devnet

Note: Only chains that match your `ORDERLY_NETWORK` setting will be available for use.

## Usage

### Deposit Funds

```typescript
import { orderlyPlugin } from "@elizaos/plugin-orderly";

const result = await eliza.execute({
    action: "DEPOSIT_USDC",
    content: {
        amount: "100",
        token: "USDC",
    },
});
```

### Create Trading Order

```typescript
const result = await eliza.execute({
    action: "CREATE_ORDER",
    content: {
        symbol: "PERP_ETH_USDC",
        orderType: "LIMIT",
        side: "BUY",
        price: "1800",
        quantity: "1",
    },
});
```

### Close Position

```typescript
const result = await eliza.execute({
    action: "CLOSE_POSITION",
    content: {
        symbol: "PERP_ETH_USDC",
        quantity: "1",
    },
});
```

### Withdraw Funds

```typescript
const result = await eliza.execute({
    action: "WITHDRAW_USDC",
    content: {
        token: "USDC",
        amount: "50",
    },
});
```

## API Reference

### Actions

#### `DEPOSIT_USDC`

Deposits USDC funds into your Orderly Network account.

```typescript
{
  action: 'DEPOSIT_USDC',
  content: {
    token: string,    // Token symbol (e.g., "USDC")
    amount: string,   // Amount to deposit
  }
}
```

#### `CREATE_ORDER`

Creates a new trading order.

```typescript
{
  action: 'CREATE_ORDER',
  content: {
    symbol: string,     // Trading pair (e.g., "PERP_ETH_USDC")
    orderType: string,  // "LIMIT" or "MARKET"
    side: string,       // "BUY" or "SELL"
    price: string,      // Price for limit orders
    quantity: string    // Order quantity
  }
}
```

#### `CLOSE_POSITION`

Closes an existing trading position.

```typescript
{
  action: 'CLOSE_POSITION',
  content: {
    symbol: string,     // Trading pair
    quantity: string    // Position size to close
  }
}
```

#### `WITHDRAW_USDC`

Withdraws USDC funds from your Orderly Network account.

```typescript
{
  action: 'WITHDRAW_USDC',
  content: {
    token: string,    // Token symbol (e.g., "USDC")
    amount: string    // Amount to withdraw
  }
}
```

## Dependencies

- @elizaos/core: Core Eliza OS functionality
- @elizaos/plugin-evm: EVM blockchain integration
- @noble/ed25519: ED25519 cryptographic operations
- @orderly.network/core: Orderly Network core functionality
- @orderly.network/default-solana-adapter: Solana adapter for Orderly Network
- @orderly.network/types: Orderly Network type definitions
- @solana/spl-token: Solana SPL token functionality
- @solana/web3.js: Solana Web3 library
- bignumber.js: Precise number handling
- bs58: Base58 encoding/decoding
- ts-pattern: Pattern matching for TypeScript
- zod: TypeScript-first schema validation

## License

This plugin is part of the Eliza project. See the main project repository for license information.
