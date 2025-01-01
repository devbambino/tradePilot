import { 
  StrategyConfig, 
  MarketData, 
  OrderParams, 
  PortfolioBalance,
  OrderProposal,
  PricingProposal,
  SizingProposal,
  InventorySkewRatios,
  OrderType,
  ORDER_PROPOSAL_ACTION_CREATE_ORDERS,
  ORDER_PROPOSAL_ACTION_CANCEL_ORDERS,
  MarketMakingConfig
} from '../types';
import { HummingbotPlugin } from '../index';

export class SimpleMarketMaking {
  private plugin: HummingbotPlugin;
  private config: MarketMakingConfig;
  private isRunning: boolean = false;
  private activeOrders: Map<string, OrderParams> = new Map();
  private lastRefreshTime: number = 0;
  private lastFillTimestamp: number = 0;
  private baseBalance: number = 0;
  private quoteBalance: number = 0;

  constructor(plugin: HummingbotPlugin, config: MarketMakingConfig) {
    this.plugin = plugin;
    this.config = config;
  }

  async start(): Promise<() => Promise<void>> {
    this.isRunning = true;
    
    // Subscribe to market data
    const unsubscribe = await this.plugin.subscribeToMarketData(
      this.config.exchange,
      this.config.tradingPair,
      this.handleMarketData.bind(this)
    );

    // Start balance tracking
    await this.updateBalances();
    const balanceInterval = setInterval(() => this.updateBalances(), 30000);

    // Return cleanup function
    return async () => {
      this.isRunning = false;
      await this.cancelAllOrders();
      unsubscribe();
      clearInterval(balanceInterval);
    };
  }

  private async updateBalances(): Promise<void> {
    const [base, quote] = this.config.tradingPair.split('-');
    const balances = await this.plugin.getBalances();
    
    this.baseBalance = balances.find(b => b.asset === base)?.free || 0;
    this.quoteBalance = balances.find(b => b.asset === quote)?.free || 0;
  }

  private async handleMarketData(data: MarketData): Promise<void> {
    if (!this.isRunning) return;

    const now = Date.now();
    
    // Check cooldown after fills
    if (now - this.lastFillTimestamp < (this.config.params.cooldownPeriod || 60) * 1000) {
      return;
    }

    // Check order refresh time
    if (now - this.lastRefreshTime < (this.config.params.maxOrderAge || 60) * 1000) {
      return;
    }

    try {
      // Create order proposals
      const proposal = await this.createProposals(data);
      
      // Execute the proposals
      if (proposal.actions & ORDER_PROPOSAL_ACTION_CANCEL_ORDERS) {
        await this.cancelOrders(proposal.cancelOrderIds);
      }
      
      if (proposal.actions & ORDER_PROPOSAL_ACTION_CREATE_ORDERS) {
        await this.createOrders(proposal);
      }

      this.lastRefreshTime = now;
    } catch (error) {
      console.error('Error in market making cycle:', error);
    }
  }

  private async createProposals(marketData: MarketData): Promise<OrderProposal> {
    // Get reference price
    const refPrice = await this.getRefPrice(marketData);
    if (!refPrice) {
      throw new Error('Unable to determine reference price');
    }

    // Create pricing proposal
    const pricingProposal = this.createPricingProposal(refPrice);
    
    // Create sizing proposal
    const sizingProposal = this.createSizingProposal();

    // Combine into final proposal
    return {
      actions: ORDER_PROPOSAL_ACTION_CREATE_ORDERS | ORDER_PROPOSAL_ACTION_CANCEL_ORDERS,
      buyOrderType: 'limit' as OrderType,
      buyOrderPrices: pricingProposal.buyOrderPrices,
      buyOrderSizes: sizingProposal.buyOrderSizes,
      sellOrderType: 'limit' as OrderType,
      sellOrderPrices: pricingProposal.sellOrderPrices,
      sellOrderSizes: sizingProposal.sellOrderSizes,
      cancelOrderIds: Array.from(this.activeOrders.keys())
    };
  }

  private async getRefPrice(marketData: MarketData): Promise<number | null> {
    switch (this.config.params.priceSource) {
      case 'current_market':
        return marketData.price;
      
      case 'external_market':
        if (!this.config.params.externalExchange || !this.config.params.externalMarket) {
          throw new Error('External market price source configured but missing exchange/market');
        }
        const externalData = await this.plugin.getMarketData(
          this.config.params.externalExchange,
          this.config.params.externalMarket
        );
        return externalData?.price || null;
      
      case 'custom_api':
        // Implement custom API price source if needed
        throw new Error('Custom API price source not implemented');
      
      default:
        return null;
    }
  }

  private createPricingProposal(refPrice: number): PricingProposal {
    const { spreadBasis, priceOffset, orderLevels = 1, minSpread = 0, maxSpread = 100 } = this.config.params;
    const buyPrices: number[] = [];
    const sellPrices: number[] = [];

    for (let i = 0; i < orderLevels; i++) {
      const levelMultiplier = i + 1;
      
      // Calculate spreads with bounds
      const effectiveBidSpread = Math.min(Math.max((spreadBasis + priceOffset) * levelMultiplier, minSpread), maxSpread) / 10000;
      const effectiveAskSpread = Math.min(Math.max((spreadBasis - priceOffset) * levelMultiplier, minSpread), maxSpread) / 10000;

      // Calculate prices
      const buyPrice = refPrice * (1 - effectiveBidSpread);
      const sellPrice = refPrice * (1 + effectiveAskSpread);

      buyPrices.push(buyPrice);
      sellPrices.push(sellPrice);
    }

    return { buyOrderPrices: buyPrices, sellOrderPrices: sellPrices };
  }

  private createSizingProposal(): SizingProposal {
    const { orderAmount, orderLevels = 1, inventorySkew = false, targetBaseRatio = 50 } = this.config.params;
    
    let skewRatios: InventorySkewRatios = { bidRatio: 1, askRatio: 1 };
    
    if (inventorySkew) {
      skewRatios = this.calculateInventorySkew(targetBaseRatio);
    }

    const buyOrderSizes: number[] = Array(orderLevels).fill(orderAmount * skewRatios.bidRatio);
    const sellOrderSizes: number[] = Array(orderLevels).fill(orderAmount * skewRatios.askRatio);

    return { buyOrderSizes, sellOrderSizes };
  }

  private calculateInventorySkew(targetBaseRatio: number): InventorySkewRatios {
    const totalValue = this.baseBalance + this.quoteBalance;
    if (totalValue === 0) return { bidRatio: 1, askRatio: 1 };

    const currentBaseRatio = this.baseBalance / totalValue;
    const targetRatio = targetBaseRatio / 100; // Convert from percentage
    const deviation = currentBaseRatio - targetRatio;
    
    const inventoryRangeMultiplier = this.config.params.inventoryRangeMultiplier ?? 1;
    const skewFactor = Math.min(Math.max(-deviation * inventoryRangeMultiplier, -1), 1);

    return {
      bidRatio: 1 - skewFactor,
      askRatio: 1 + skewFactor
    };
  }

  private async createOrders(proposal: OrderProposal): Promise<void> {
    const orders: OrderParams[] = [];

    // Create buy orders
    for (let i = 0; i < proposal.buyOrderPrices.length; i++) {
      orders.push({
        exchange: this.config.exchange,
        symbol: this.config.tradingPair,
        side: 'buy',
        type: proposal.buyOrderType,
        amount: proposal.buyOrderSizes[i],
        price: proposal.buyOrderPrices[i],
        timestamp: Date.now()
      });
    }

    // Create sell orders
    for (let i = 0; i < proposal.sellOrderPrices.length; i++) {
      orders.push({
        exchange: this.config.exchange,
        symbol: this.config.tradingPair,
        side: 'sell',
        type: proposal.sellOrderType,
        amount: proposal.sellOrderSizes[i],
        price: proposal.sellOrderPrices[i],
        timestamp: Date.now()
      });
    }

    // Place orders
    for (const order of orders) {
      try {
        const orderId = await this.plugin.placeOrder(order);
        this.activeOrders.set(orderId, order);
      } catch (error) {
        console.error(`Failed to place ${order.side} order:`, error);
      }
    }
  }

  private async cancelOrders(orderIds: string[]): Promise<void> {
    for (const orderId of orderIds) {
      try {
        const order = this.activeOrders.get(orderId);
        if (order) {
          await this.plugin.cancelOrder(order.exchange, orderId);
          this.activeOrders.delete(orderId);
        }
      } catch (error) {
        console.error(`Failed to cancel order ${orderId}:`, error);
      }
    }
  }

  private async cancelAllOrders(): Promise<void> {
    await this.cancelOrders(Array.from(this.activeOrders.keys()));
  }
}
