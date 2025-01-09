export interface WebhookEvent {
    event: 'buy' | 'sell';
    ticker: string;
    price: number;
    timestamp: number;
    metadata?: Record<string, any>;
}

export interface TradeAction {
    type: 'BUY' | 'SELL';
    ticker: string;
    amount: number;
    price?: number;
}