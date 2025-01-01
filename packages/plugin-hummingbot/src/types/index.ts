export interface HummingbotConfig {
  instance: {
    url: string;
    wsUrl: string;
    apiKey: string;
    instanceId: string;
  };
}

export interface MarketData {
  exchange: string;
  symbol: string;
  timestamp: number;
  bid: number;
  ask: number;
  lastPrice: number;
  volume24h: number;
}

export interface OrderParams {
  exchange: string;
  symbol: string;
  side: 'buy' | 'sell';
  type: 'limit' | 'market';
  amount: number;
  price?: number;
}

export interface MarketMakingConfig {
  exchange: string;
  tradingPair: string;
  orderAmount: number;
  orderLevels?: number;
  maxOrderAge?: number;
  inventorySkewEnabled?: boolean;
  inventoryTargetBase?: number;
  inventoryRangeMultiplier?: number;
  bidSpread: number;
  askSpread: number;
  minSpread?: number;
  maxSpread?: number;
  priceSource?: string;
  minimumSpreadEnabled?: boolean;
  pingPongEnabled?: boolean;
  orderRefreshTime?: number;
}
