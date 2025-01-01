import axios, { AxiosError } from 'axios';
import WebSocket from 'ws';
import { MarketData } from '../types';

interface WebSocketMessage {
  type: string;
  data: any;
}

export class MarketDataProvider {
  private baseUrl: string;
  private wsUrl: string;
  private apiKey?: string;
  private ws?: WebSocket;
  private subscriptions: Map<string, Set<(data: MarketData) => void>> = new Map();
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  private reconnectDelay: number = 1000;
  private pingInterval?: NodeJS.Timeout;
  private rateLimitWindowMs: number = 60000; // 1 minute
  private maxRequestsPerWindow: number = 100;
  private requestCount: number = 0;
  private requestResetTimeout?: NodeJS.Timeout;

  constructor(baseUrl: string, wsUrl: string, apiKey?: string) {
    this.baseUrl = baseUrl;
    this.wsUrl = wsUrl;
    this.apiKey = apiKey;
    this.initializeRateLimiting();
  }

  private initializeRateLimiting(): void {
    this.requestResetTimeout = setInterval(() => {
      this.requestCount = 0;
    }, this.rateLimitWindowMs);
  }

  private async checkRateLimit(): Promise<void> {
    if (this.requestCount >= this.maxRequestsPerWindow) {
      throw new Error('Rate limit exceeded. Please try again later.');
    }
    this.requestCount++;
  }

  private getHeaders(): Record<string, string> {
    return this.apiKey ? { 'X-API-Key': this.apiKey } : {};
  }

  async getPrice(exchange: string, symbol: string): Promise<number> {
    try {
      await this.checkRateLimit();
      const response = await axios.get(`${this.baseUrl}/price`, {
        params: { exchange, symbol },
        headers: this.getHeaders()
      });
      return response.data.price;
    } catch (error) {
      if (error instanceof AxiosError) {
        if (error.response?.status === 429) {
          throw new Error('Rate limit exceeded. Please try again later.');
        }
      }
      if (error instanceof Error) {
        throw new Error(`Failed to fetch price: ${error.message}`);
      }
      throw new Error('Failed to fetch price: Unknown error');
    }
  }

  async getMarketData(exchange: string, symbol: string): Promise<MarketData> {
    try {
      await this.checkRateLimit();
      const response = await axios.get(`${this.baseUrl}/market_data`, {
        params: { exchange, symbol },
        headers: this.getHeaders()
      });
      return response.data;
    } catch (error) {
      if (error instanceof AxiosError) {
        if (error.response?.status === 429) {
          throw new Error('Rate limit exceeded. Please try again later.');
        }
      }
      if (error instanceof Error) {
        throw new Error(`Failed to get market data: ${error.message}`);
      }
      throw new Error('Failed to get market data: Unknown error');
    }
  }

  async subscribeToMarketData(
    exchange: string,
    symbol: string,
    callback: (data: MarketData) => void
  ): Promise<() => void> {
    const key = `${exchange}:${symbol}`;
    
    if (!this.subscriptions.has(key)) {
      this.subscriptions.set(key, new Set());
    }
    
    this.subscriptions.get(key)!.add(callback);

    // Initialize WebSocket if not already connected
    if (!this.ws) {
      await this.connectWebSocket();
    }

    // Subscribe to the market data stream
    this.sendWebSocketMessage({
      type: 'subscribe',
      data: { exchange, symbol }
    });

    // Return unsubscribe function
    return () => {
      const callbacks = this.subscriptions.get(key);
      if (callbacks) {
        callbacks.delete(callback);
        if (callbacks.size === 0) {
          this.subscriptions.delete(key);
          this.sendWebSocketMessage({
            type: 'unsubscribe',
            data: { exchange, symbol }
          });
        }
      }
    };
  }

  private async connectWebSocket(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(this.wsUrl, {
        headers: this.getHeaders()
      });

      this.ws.on('open', () => {
        console.log('WebSocket connected');
        this.reconnectAttempts = 0;
        this.setupPingInterval();
        resolve();
      });

      this.ws.on('message', (data: WebSocket.Data) => {
        try {
          const message: WebSocketMessage = JSON.parse(data.toString());
          if (message.type === 'marketData') {
            const marketData: MarketData = message.data;
            const key = `${marketData.exchange}:${marketData.symbol}`;
            const callbacks = this.subscriptions.get(key);
            if (callbacks) {
              callbacks.forEach(callback => callback(marketData));
            }
          }
        } catch (error) {
          if (error instanceof Error) {
            console.error('Error processing WebSocket message:', error.message);
          } else {
            console.error('Error processing WebSocket message: Unknown error');
          }
        }
      });

      this.ws.on('close', () => {
        console.log('WebSocket disconnected');
        this.cleanup();
        this.attemptReconnect();
      });

      this.ws.on('error', (error) => {
        if (error instanceof Error) {
          console.error('WebSocket connection error:', error.message);
        } else {
          console.error('WebSocket connection error: Unknown error');
        }
        reject(error);
      });
    });
  }

  private setupPingInterval(): void {
    this.pingInterval = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.sendWebSocketMessage({ type: 'ping', data: null });
      }
    }, 30000);
  }

  private sendWebSocketMessage(message: WebSocketMessage): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    }
  }

  private cleanup(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = undefined;
    }
  }

  private async attemptReconnect(): Promise<void> {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
    
    console.log(`Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts})`);
    
    await new Promise(resolve => setTimeout(resolve, delay));
    
    try {
      await this.connectWebSocket();
      
      // Resubscribe to all active subscriptions
      for (const [key, callbacks] of this.subscriptions.entries()) {
        if (callbacks.size > 0) {
          const [exchange, symbol] = key.split(':');
          this.sendWebSocketMessage({
            type: 'subscribe',
            data: { exchange, symbol }
          });
        }
      }
    } catch (error) {
      if (error instanceof Error) {
        console.error('Reconnection failed:', error.message);
      } else {
        console.error('Reconnection failed: Unknown error');
      }
    }
  }

  dispose(): void {
    this.cleanup();
    this.ws?.close();
    if (this.requestResetTimeout) {
      clearInterval(this.requestResetTimeout);
    }
  }
}
