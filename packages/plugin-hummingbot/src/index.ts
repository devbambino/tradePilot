import { IAgentRuntime, Plugin } from '@elizaos/core';
import { MarketDataProvider } from './providers/market-data-provider';
import { OrderService } from './providers/order-provider';
import { StrategyService } from './providers/strategy-provider';
import { 
  MarketData, 
  OrderParams, 
  StrategyConfig, 
  PortfolioBalance,
  HummingbotInstance,
  HummingbotConfig 
} from './types';
import axios from 'axios';

/**
 * HummingbotPlugin provides integration with Hummingbot for market making and trading.
 * It manages market data streaming, order execution, and strategy management.
 */
export class HummingbotPlugin extends Plugin {
  public readonly name = 'hummingbot';
  public readonly description = 'Hummingbot integration for market making and trading';

  private config: HummingbotConfig;
  private context!: IAgentRuntime;
  private marketDataProvider!: MarketDataProvider;
  private _orderService!: OrderService;
  private _strategyService!: StrategyService;
  private strategies: Map<string, StrategyConfig> = new Map();

  constructor(config: HummingbotConfig) {
    super();
    this.config = config;
  }

  public async init(context: IAgentRuntime): Promise<void> {
    this.context = context;
    
    if (!this.config.instance.url || !this.config.instance.apiKey) {
      throw new Error('Missing required configuration: url and apiKey must be provided');
    }
    
    const baseUrl = this.config.instance.url;
    const apiKey = this.config.instance.apiKey;
    
    this.marketDataProvider = new MarketDataProvider(baseUrl, apiKey);
    this._orderService = new OrderService(baseUrl, apiKey);
    this._strategyService = new StrategyService(baseUrl, apiKey);

    // Start pre-configured strategy if any
    if (this.config.strategy) {
      await this.startStrategy(this.config.strategy);
    }
  }

  public get marketDataService(): MarketDataProvider {
    return this.marketDataProvider;
  }

  public get orderService(): OrderService {
    return this._orderService;
  }

  public get strategyService(): StrategyService {
    return this._strategyService;
  }

  /**
   * Gets current price for a trading pair
   * @param exchange Exchange identifier
   * @param symbol Trading pair symbol
   * @returns Current price
   */
  async getPrice(exchange: string, symbol: string): Promise<number> {
    return this.marketDataService.getPrice(exchange, symbol);
  }

  /**
   * Gets current market data for a trading pair
   * @param exchange Exchange identifier
   * @param symbol Trading pair symbol
   * @returns Market data
   */
  async getMarketData(exchange: string, symbol: string): Promise<MarketData> {
    return this.marketDataService.getMarketData(exchange, symbol);
  }

  /**
   * Subscribes to real-time market data updates
   * @param exchange Exchange identifier
   * @param symbol Trading pair symbol
   * @param callback Callback function for market data updates
   * @returns Unsubscribe function
   */
  subscribeToMarketData(
    exchange: string,
    symbol: string,
    callback: (data: MarketData) => void
  ): Promise<() => void> {
    return this.marketDataProvider.subscribeToMarketData(exchange, symbol, callback);
  }

  /**
   * Places a new order
   * @param params Order parameters
   * @returns Order ID
   * @throws Error if order placement fails
   */
  async placeOrder(params: OrderParams): Promise<string> {
    return this._orderService.placeOrder(params);
  }

  /**
   * Cancels an existing order
   * @param exchange Exchange identifier
   * @param orderId Order ID to cancel
   * @returns True if order was cancelled successfully
   * @throws Error if order cancellation fails
   */
  async cancelOrder(exchange: string, orderId: string): Promise<boolean> {
    return this._orderService.cancelOrder(exchange, orderId);
  }

  /**
   * Gets current order status
   * @param exchange Exchange identifier
   * @param orderId Order ID to get status for
   * @returns Order status
   */
  async getOrderStatus(exchange: string, orderId: string): Promise<any> {
    return this._orderService.getOrderStatus(exchange, orderId);
  }

  /**
   * Starts a trading strategy
   * @param config Strategy configuration
   * @returns Strategy ID
   */
  async startStrategy(config: StrategyConfig): Promise<string> {
    return this._strategyService.startStrategy(config);
  }

  /**
   * Stops a running strategy
   * @param strategyId The ID of the strategy to stop
   */
  public async stopStrategy(strategyId: string): Promise<void> {
    await this._strategyService.stopStrategy(strategyId);
  }

  /**
   * Gets current strategy status
   * @param strategyId Strategy ID to get status for
   * @returns Strategy status
   */
  public async getStrategyStatus(strategyId: string): Promise<any> {
    return this._strategyService.getStrategyStatus(strategyId);
  }

  /**
   * Gets the current balances for all assets
   * @returns Promise resolving to array of portfolio balances
   */
  async getBalances(): Promise<PortfolioBalance[]> {
    const response = await axios.get(`${this.config.instance.url}/balances`, {
      headers: this.config.instance.apiKey ? {
        'X-API-Key': this.config.instance.apiKey
      } : undefined
    });
    return response.data;
  }
}

export const hummingbotPlugin = (config: HummingbotConfig): Plugin => {
  return new HummingbotPlugin(config);
};

export * from './actions/market-making';
export * from './actions/orders';
export * from './types';
