/**
 * Market data information for a trading pair
 */
export interface MarketData {
  /** Exchange identifier */
  exchange: string;
  /** Trading pair symbol */
  symbol: string;
  /** Current market price */
  price: number;
  /** Trading volume */
  volume: number;
  /** Timestamp of the data */
  timestamp: number;
  /** Best bid price */
  bid?: number;
  /** Best ask price */
  ask?: number;
  /** Last trade price */
  lastTradePrice?: number;
  /** Last trade size */
  lastTradeSize?: number;
}

/** Order type - market or limit */
export type OrderType = 'market' | 'limit';

/** Order side - buy or sell */
export type OrderSide = 'buy' | 'sell';

/**
 * Parameters for placing an order
 */
export interface OrderParams {
  /** Exchange to place the order on */
  exchange: string;
  /** Trading pair symbol */
  symbol: string;
  /** Order side (buy/sell) */
  side: OrderSide;
  /** Order type (market/limit) */
  type: OrderType;
  /** Order amount in base currency */
  amount: number;
  /** Order price (required for limit orders) */
  price?: number;
  /** Order timestamp */
  timestamp?: number;
  /** Client-generated order ID */
  clientOrderId?: string;
}

/**
 * Proposal for creating and canceling orders
 */
export interface OrderProposal {
  /** Bitwise combination of order actions */
  actions: number;
  /** Type of buy orders */
  buyOrderType: OrderType;
  /** Array of buy order prices */
  buyOrderPrices: number[];
  /** Array of buy order sizes */
  buyOrderSizes: number[];
  /** Type of sell orders */
  sellOrderType: OrderType;
  /** Array of sell order prices */
  sellOrderPrices: number[];
  /** Array of sell order sizes */
  sellOrderSizes: number[];
  /** Array of order IDs to cancel */
  cancelOrderIds: string[];
}

/**
 * Proposal for order pricing
 */
export interface PricingProposal {
  /** Array of buy order prices */
  buyOrderPrices: number[];
  /** Array of sell order prices */
  sellOrderPrices: number[];
}

/**
 * Proposal for order sizing
 */
export interface SizingProposal {
  /** Array of buy order sizes */
  buyOrderSizes: number[];
  /** Array of sell order sizes */
  sellOrderSizes: number[];
}

/**
 * Ratios for inventory skew calculations
 */
export interface InventorySkewRatios {
  /** Ratio for bid orders */
  bidRatio: number;
  /** Ratio for ask orders */
  askRatio: number;
}

/**
 * Price and size combination for an order
 */
export interface PriceSize {
  /** Order price */
  price: number;
  /** Order size */
  size: number;
}

/**
 * Combined buy and sell orders proposal
 */
export interface Proposal {
  /** Array of buy orders */
  buys: PriceSize[];
  /** Array of sell orders */
  sells: PriceSize[];
}

/**
 * Strategy configuration parameters
 */
export interface StrategyConfig {
  /** Strategy name */
  name: string;
  /** Exchange to trade on */
  exchange: string;
  /** Trading pair */
  tradingPair: string;
  /** Strategy-specific parameters */
  params: Record<string, any>;
}

/**
 * Market making strategy configuration
 */
export interface MarketMakingConfig extends StrategyConfig {
  params: {
    // Order Sizing
    orderAmount: number;           // Base order size
    orderLevels: number;          // Number of order levels
    maxOrderAge: number;          // Maximum order age in seconds
    
    // Pricing
    spreadBasis: number;          // Bid-ask spread in basis points
    priceOffset: number;          // Price offset from mid price
    minSpread: number;            // Minimum spread in basis points
    maxSpread: number;            // Maximum spread in basis points
    priceSource: 'current_market' | 'external_market' | 'custom_api';  // Source of price data
    externalExchange?: string;    // External exchange for price source
    externalMarket?: string;      // External market for price source
    
    // Inventory Management
    inventorySkew: boolean;       // Enable inventory skew
    targetBaseRatio: number;      // Target base asset ratio
    inventoryRangeMultiplier?: number; // Multiplier for inventory skew range
    
    // Risk Management
    minProfitBasis: number;       // Minimum profit in basis points
    maxLoss: number;              // Maximum loss percentage
    cooldownPeriod: number;       // Cooldown period after fills
  };
}

/**
 * Portfolio balance information
 */
export interface PortfolioBalance {
  /** Asset symbol */
  asset: string;
  /** Available balance */
  free: number;
  /** Locked balance (in orders) */
  locked: number;
  /** Total balance (free + locked) */
  total: number;
}

/**
 * Hummingbot instance configuration
 */
export interface HummingbotInstance {
  /** URL of the Hummingbot instance */
  url: string;
  /** API key for the Hummingbot instance */
  apiKey?: string;
  /** Unique identifier for the Hummingbot instance */
  instanceId: string;
}

/**
 * Hummingbot configuration
 */
export interface HummingbotConfig {
  /** Instance configuration */
  instance: HummingbotInstance;
  /** Strategy configuration */
  strategy: StrategyConfig;
}

/** Action flag for creating new orders */
export const ORDER_PROPOSAL_ACTION_CREATE_ORDERS = 1;

/** Action flag for canceling existing orders */
export const ORDER_PROPOSAL_ACTION_CANCEL_ORDERS = 1 << 1;
