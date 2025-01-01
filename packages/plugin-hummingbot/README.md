# Hummingbot Plugin for Eliza

A powerful plugin that integrates Hummingbot's market making capabilities with Eliza trading agents. This plugin enables Eliza to perform automated market making and trading operations using Hummingbot's infrastructure.

## Features

- Real-time market data streaming via WebSocket
- Simple market making strategy with configurable parameters
- Inventory skew management
- Order lifecycle management (create, cancel, track)
- Rate limiting and error handling
- Automatic reconnection and recovery
- Multi-level order book support

## Installation

```bash
npm install @eliza/plugin-hummingbot
```

## Environment Variables

The plugin uses the following environment variables:
```
HUMMINGBOT_API_URL=http://localhost:15888  # Hummingbot REST API URL
HUMMINGBOT_WS_URL=ws://localhost:8060      # Hummingbot WebSocket URL
HUMMINGBOT_API_KEY=your-api-key            # Hummingbot API Key
```

## Usage in Eliza Character

Add the plugin to your character configuration:

```json
{
  "plugins": ["@eliza/plugin-hummingbot"],
  "settings": {
    "HUMMINGBOT_CONFIG": {
      "instance": {
        "url": "${HUMMINGBOT_API_URL}",
        "wsUrl": "${HUMMINGBOT_WS_URL}",
        "apiKey": "${HUMMINGBOT_API_KEY}",
        "instanceId": "eli-agent"
      },
      "defaultStrategy": {
        "exchange": "binance",
        "tradingPair": "BTC-USDT",
        "orderAmount": 0.001,
        "orderLevels": 2,
        "maxOrderAge": 1800,
        "inventorySkewEnabled": true,
        "inventoryTargetBase": 50,
        "bidSpread": 0.2,
        "askSpread": 0.2,
        "minSpread": 0.1,
        "maxSpread": 0.5,
        "priceSource": "current_market",
        "orderRefreshTime": 60
      }
    }
  }
}
```

> **Note:** The `url` and `apiKey` fields in the instance configuration are required. The plugin will throw an error if either of these values is missing or undefined.

## Quick Start

```typescript
import { HummingbotPlugin } from '@eliza/plugin-hummingbot';
import { SimpleMarketMaking } from '@eliza/plugin-hummingbot/strategies';

// Initialize the plugin
const plugin = new HummingbotPlugin({
  instance: {
    url: process.env.HUMMINGBOT_API_URL,      // Default Hummingbot REST API port
    wsUrl: process.env.HUMMINGBOT_WS_URL,       // Default Hummingbot WebSocket port
    apiKey: process.env.HUMMINGBOT_API_KEY,
    instanceId: 'instance-1'
  }
});

// Initialize plugin
await plugin.init();

// Configure market making strategy
const config = {
  exchange: "binance",
  tradingPair: "BTC-USDT",
  orderAmount: 0.001,           // Base order size in BTC
  orderLevels: 2,               // Number of orders on each side
  maxOrderAge: 1800,            // Maximum order age in seconds
  inventorySkewEnabled: true,
  inventoryTargetBase: 50,      // Target base asset percentage
  inventoryRangeMultiplier: 1.5,
  bidSpread: 0.2,              // 0.2% spread for bids
  askSpread: 0.2,              // 0.2% spread for asks
  minSpread: 0.1,              // Minimum allowed spread
  maxSpread: 0.5,              // Maximum allowed spread
  priceSource: 'current_market',
  minimumSpreadEnabled: true,
  pingPongEnabled: false,
  orderRefreshTime: 60         // Refresh orders every 60 seconds
};

// Create and start the strategy
const strategy = new SimpleMarketMaking(plugin, config);
const stopStrategy = await strategy.start();

// Handle shutdown gracefully
process.on('SIGINT', async () => {
  console.log('Shutting down strategy...');
  await stopStrategy();
  process.exit(0);
});
```

## Configuration Guide

### Plugin Configuration

| Parameter  | Type   | Description | Required |
|-----------|--------|-------------|----------|
| url       | string | Hummingbot REST API URL | Yes |
| wsUrl     | string | Hummingbot WebSocket URL | Yes |
| apiKey    | string | API key for authentication | Yes |
| instanceId| string | Unique identifier for the instance | Yes |

### Market Making Strategy Configuration

| Parameter | Type | Description | Required | Default |
|-----------|------|-------------|----------|---------|
| exchange | string | Exchange to trade on | Yes | - |
| tradingPair | string | Trading pair (e.g., "BTC-USDT") | Yes | - |
| orderAmount | number | Base order size | Yes | - |
| orderLevels | number | Number of orders on each side | No | 1 |
| maxOrderAge | number | Maximum order age in seconds | No | 1800 |
| inventorySkewEnabled | boolean | Enable inventory skew | No | false |
| inventoryTargetBase | number | Target base asset % | No | 50 |
| bidSpread | number | Bid spread percentage | Yes | - |
| askSpread | number | Ask spread percentage | Yes | - |
| minSpread | number | Minimum spread percentage | No | 0.1 |
| maxSpread | number | Maximum spread percentage | No | 0.5 |
| priceSource | string | Price source for orders | No | 'current_market' |
| orderRefreshTime | number | Order refresh interval (seconds) | No | 60 |

## API Reference

### HummingbotPlugin

#### Methods

- `init(): Promise<void>` - Initialize the plugin
- `subscribeToMarketData(exchange: string, symbol: string, callback: (data: MarketData) => void): Promise<() => void>` - Subscribe to market data
- `placeOrder(params: OrderParams): Promise<string>` - Place a new order
- `cancelOrder(exchange: string, orderId: string): Promise<boolean>` - Cancel an order
- `getOrderStatus(exchange: string, orderId: string): Promise<any>` - Get order status

### SimpleMarketMaking Strategy

#### Methods

- `start(): Promise<() => void>` - Start the market making strategy
- `updateBalances(): Promise<void>` - Update portfolio balances
- `cancelAllOrders(): Promise<void>` - Cancel all active orders

## Error Handling

The plugin implements comprehensive error handling:

- Rate limit handling with automatic retries
- WebSocket connection management with automatic reconnection
- Order validation and error reporting
- Balance checking before order placement

## Prerequisites

- Running Hummingbot instance
- Valid API credentials
- Sufficient balance on the target exchange
