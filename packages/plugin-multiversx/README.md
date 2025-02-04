# @elizaos/plugin-multiversx

MultiversX blockchain integration plugin for Eliza OS that enables token management and transfers.

This plugin is under development and will soon include additional features and improvements.

## Overview

This plugin serves as the foundation for interacting with the MultiversX ecosystem, enabling secure and efficient blockchain transactions and token management within Eliza OS.

### Features

- Multiple network support (mainnet, devnet, testnet)
- Secure transaction signing
- Automatic nonce management

### Actions
- EGLD and ESDT token transfers
- ESDT creation and management 
- ESDT Swap
- Token Swap


## User Guide

### Installation

To install the plugin, run:

```bash
pnpm install @elizaos/plugin-multiversx
```

### ElizaOs .env Configuration

Before using the plugin, configure the necessary environment variables in the **.env** file at the ElizaOS level:

```.env
MVX_PRIVATE_KEY=your-wallet-private-key
MVX_NETWORK=devnet  # mainnet, devnet, or testnet
ACCESS_TOKEN_MANAGEMENT_TO=everyone  # you can put an userid to limit token management to one user only (use same id as in the database)
```

#### Private Key

The `MVX_PRIVATE_KEY` variable needs to be generated using `mxpy wallet convert` as it requires a specific hex format.

You will need at least `mxpy` version **9.11.0** installed on your machine, as this feature was added in [release 9.11.0](https://github.com/multiversx/mx-sdk-py-cli/releases/tag/v9.11.0).

Refer to the [documentation](https://docs.multiversx.com/sdk-and-tools/sdk-py/installing-mxpy) for installation or updating to a specific version.

##### Example:

```shell
# Check available options for the convert command
~$ mxpy wallet convert -h

# Convert a PEM file into a hex secret key:
~$ mxpy wallet convert --infile wallet.pem --in-format pem --out-format secret-key
Output:

po8ed118werc69c9be506df87f76d6e919f61d3559ed8g68bb78b39fcddc8t9y
```

#### Environment

The plugin supports the following networks:

- Mainnet: `mainnet`
- Devnet: `devnet`
- Testnet: `testnet`

### Trigger Agent actions in chat bot

#### Create New ESDT
 ```
 Can you create a token on multiversx called MULTIVERS with a ticker MUL, an amount of 10000 and 18 decimals?
 ```
#### Transfer EGLD
 ```
 Can you transfer 10 EGLD to erd1tjygwhw5ylmv3v52ucvhmz0q7r0hafz4cfndjaskss5ahz28l3hqdvxqct ?
 ```

## Usage

### Token Transfer

```typescript
import { multiversxPlugin } from "@elizaos/plugin-multiversx";

// Send EGLD
const result = await eliza.execute({
    action: "SEND_TOKEN",
    content: {
        tokenAddress: "erd1...",
        amount: "1",
        tokenIdentifier: "EGLD",
    },
});

// Send ESDT
const result = await eliza.execute({
    action: "SEND_TOKEN",
    content: {
        tokenAddress: "erd1...",
        amount: "100",
        tokenIdentifier: "TEST-a1b2c3",
    },
});
```

### Token Creation

```typescript
const result = await eliza.execute({
    action: "CREATE_TOKEN",
    content: {
        tokenName: "TestToken",
        tokenTicker: "TEST",
        decimals: "18",
        amount: "1000000",
    },
});
```

### Token Swap

```typescript
const result = await eliza.execute({
    action: "SWAP",
    content: {
        tokenIn: "EGLD",
        amountIn: "1",
        tokenOut: "MEX"
    },
});
```

### Pool Creation

```typescript
const result = await eliza.execute({
    action: "CREATE_POOL",
    content: {
        baseTokenID: "KWAK",
        quoteTokenID: "EGLD",
        baseAmount: "1000000",
        quoteAmount: "20"
    },
});
```
## Contributor Guide

There are multiple contributors within the ecosystem working on the MultiversX ElizaOS plugin. It is recommended to check the [Telegram group](https://t.me/MultiversXDevelopers) to see if someone is already working on a similar feature before starting your contribution.

The MultiversX plugin is part of the ElizaOS project, and all contributions must adhere to its guidelines.
Please refer to the root [CONTRIBUTING.md](../../CONTRIBUTING.md) file for details on how to contribute.

### Setting Up a Development Environment

To develop the plugin, open a terminal in the project folder. When making modifications, rebuild the plugin to test it with your local agent:

```bash
pnpm build
```

To run all tests:

```bash
pnpm test
```

For watch mode during development, where tests run automatically upon saving changes:

```bash
pnpm test:watch
```

### Adding a New Action

When adding a new action, reuse providers and utilities from existing actions where possible. If necessary, add more utilities that benefit other actions.

1. Add the action to the `src/actions` directory, following the existing coding style.
2. Export the action in the `src/index.ts` file.

---

## Credits & Additional Resources

This plugin integrates with the [MultiversX blockchain](https://multiversx.com/) using its official SDK.

Special thanks to:
- The MultiversX team for developing the MultiversX blockchain.
- The Eliza community for their contributions and feedback.

For more information about MultiversX blockchain capabilities:
- [MultiversX Documentation](https://docs.multiversx.com/)
- [MultiversX Developer Portal](https://docs.multiversx.com/developers/getting-started/introduction)
- [MultiversX GitHub Repository](https://github.com/multiversx/mx-sdk-js)

## License

This plugin is part of the Eliza project. See the main project repository's [LICENSE](../../LICENSE) file for license information.

