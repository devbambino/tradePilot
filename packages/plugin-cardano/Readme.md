# Plugin Cardano

A plugin for handling Cardano blockchain operations, such as wallet management and transfers.

## Overview and Purpose

The Plugin provides a streamlined interface to interact with the Cardano blockchain. It simplifies wallet management and facilitates secure, efficient transfers while maintaining compatibility with TypeScript and modern JavaScript development practices.

## Installation

Install the plugin using npm:

```bash
npm install plugin-cardano
```

## Configuration Requirements

Ensure your environment is set up with the necessary configuration files and environment variables. Update the `src/enviroment.ts` file or set environment variables directly for sensitive information.

### Environment Variables

| Variable Name            | Description                                                      |
| ------------------------ | ---------------------------------------------------------------- |
| `CARDANO_NETWORK`        | Cardano network (Mainnet/Preprod/Preview)                        |
| `CARDANO_PRIVATE_KEY`    | Cardano mnemonics                                                |
| `CARDANO_MAESTRO_APIKEY` | [Maestro api key(daily limit)](https://dashboard.gomaestro.org/) |
| `CARDANO_RPC_URL`        | RPC endpoint                                                     |

* `CARDANO_NETWORK` default value is `Mainnet`
* `CARDANO_RPC_URL` Not supported at the moment

## Usage Examples

### Testing Guide Expansion

Run tests using the following command:

```bash
pnpm run test
```

The `src/tests/wallet.test.ts` file provides unit tests for wallet functionality. Add tests for additional features as needed.
