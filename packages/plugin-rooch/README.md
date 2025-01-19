# @elizaos/plugin-rooch

Core Rooch plugin for Eliza OS that provides essential services and actions for wallet management and token operations on the Rooch network.

## Overview

This plugin provides functionality to:
- Transfer tokens between wallets (currently supporting RGas for GAS consumption)
- Query wallet balances and portfolio values
- Manage wallet interactions with the Rooch network

## Installation

```bash
npm install @elizaos/plugin-rooch
```

## Configuration

The plugin requires the following environment variables:

```env
ROOCH_PRIVATE_KEY=your_private_key
ROOCH_NETWORK=mainnet|testnet|devnet|localnet
```

## Usage

Import and register the plugin in your Eliza configuration:

```typescript
import { roochPlugin } from "@elizaos/plugin-rooch";

export default {
  plugins: [roochPlugin],
  // ... other configuration
};
```

## Features

### Send RGas

Transfer RGas (Rooch network gas token) to another address:

```typescript
// Example conversation
User: "Send 10 RGas to 0x4f2e63be8e7fe287836e29cde6f3d5cbc96eefd0c0e3f3747668faa2ae7324b0"
Assistant: "I'll send 10 RGas now..."
```

### Check Wallet Balance

Query wallet balance and portfolio value:

```typescript
// Example conversation
User: "What's my wallet balance?"
Assistant: "Your wallet contains 100 RGas..."
```

### Load character from rooch foc_eliza character object
```bash
pnpm start --character rooch://object/0x167f5fab11227c394905cbad1e8b25d0d12c6a881ba2d6899e9dbf8138eaecfd
```

## API Reference

### Actions

- `SEND_TOKEN`: Transfer RGas to another address
- `TRANSFER_TOKEN`: Alias for SEND_TOKEN
- `SEND_RGAS`: Alias for SEND_TOKEN
- `PAY`: Alias for SEND_TOKEN

### Providers

- `walletProvider`: Manages wallet interactions with the Rooch network, including balance queries and portfolio tracking

## Development

### Building

```bash
npm run build
```

### Testing

```bash
npm run test
```

## Dependencies

- `@roochnetwork/rooch-sdk`: Core Rooch blockchain interaction library
- `bignumber.js`: Precise number handling
- `node-cache`: Caching implementation
- Other standard dependencies listed in package.json

## Future Enhancements

The following features and improvements are planned for future releases:

1. **Transaction Management**
   - Batch transaction processing
   - Transaction simulation
   - Gas optimization strategies
   - Custom transaction builders
   - Advanced error handling

2. **Wallet Integration**
   - Multi-wallet support
   - Hardware wallet integration
   - Social recovery options
   - Account abstraction
   - Transaction history tracking

3. **Smart Contract Features**
   - Contract deployment tools
   - Move module templates
   - Testing framework
   - Upgrade management
   - Security analysis

4. **Token Operations**
   - Batch token transfers
   - Token metadata handling
   - Custom token standards
   - Collection management

5. **Developer Tools**
   - Enhanced debugging
   - CLI improvements
   - Documentation generator
   - Integration templates
   - Performance monitoring

We welcome community feedback and contributions to help prioritize these enhancements.

## Contributing

Contributions are welcome! Please see the [CONTRIBUTING.md](CONTRIBUTING.md) file for more information.

## Credits

This plugin integrates with and builds upon several key technologies:

- [Rooch Network](https://rooch.network): The Bitcoin Application Layer features MoveVM and Bitcoin staking.
- [@roochnetwork/rooch-sdk](https://www.npmjs.com/package/@roochnetwork/rooch-sdk): Official Rooch SDK
- [bignumber.js](https://github.com/MikeMcl/bignumber.js/): Precise number handling
- [node-cache](https://www.npmjs.com/package/node-cache): Caching implementation

Special thanks to:
- The Rooch team for developing the Rooch network
- The Rooch Developer community
- The Rooch SDK maintainers
- The Eliza community for their contributions and feedback

For more information about Rooch network capabilities:
- [Rooch Documentation](https://rooch.network/learn/overview)
- [Rooch Developer Portal](https://rooch.network/learn/overview)
- [Rooch GitHub Repository](https://github.com/rooch-network)

## License

This plugin is part of the Eliza project. See the main project repository for license information.