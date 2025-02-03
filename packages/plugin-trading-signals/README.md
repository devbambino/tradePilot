# @elizaos/plugin-trading-signals

A plugin for ElizaOS that integrates with AlphaX trading signals API.

## Features

-   Real-time trading signals
-   Multi-symbol support
-   Signal intensity analysis
-   Price prediction ranges
-   Rate limiting and error handling

## Installation

```bash
pnpm install @elizaos/plugin-trading-signals
```

## Configuration

Add to your `.env` file:

```env
ALPHAX_API_KEY=your_token_here
ALPHAX_API_BASE_URL=https://alpha-x.ai/alphax/api
```

## Usage

```typescript
// Fetch trading signals for BTC/USDT
await runtime.executeAction("FETCH_SIGNALS", { symbol: "BTCUSDT" });
```

## API Response Example

```json
{
    "status": true,
    "data": {
        "signals": [
            {
                "signal_id": 1437,
                "symbol": "BTCUSDT",
                "create_at": 1738370067,
                "signal_type": 1,
                "signal_intensity": 1,
                "locked_price": "102411.88",
                "prediction_min_price": "102947.24",
                "prediction_max_price": "103464.13",
                "status": "predicting"
            }
        ]
    }
}
```

## Development

```bash
# Install dependencies
pnpm install

# Development mode
pnpm dev

# Build
pnpm build

# Lint code
pnpm lint
```

## Features in Detail

### Signal Types

-   UP (1): Indicates potential price increase
-   DOWN (2): Indicates potential price decrease

### Signal Intensity

-   1: Low confidence
-   2: Medium confidence
-   3: High confidence

### Status Types

-   predicting: Active signal
-   completed: Finished prediction
-   cancelled: Signal cancelled

## Error Handling

The plugin includes:

-   Rate limiting protection
-   API timeout handling
-   Error logging
-   Response validation

## Contributing

Contributions are welcome! Please see our contributing guidelines.

## License

This plugin is part of the ElizaOS project and follows its licensing.
