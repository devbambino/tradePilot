import axios, { AxiosError } from 'axios';
import { OrderParams } from '../types';

export class OrderService {
  private baseUrl: string;
  private apiKey?: string;
  private rateLimitWindowMs: number = 60000; // 1 minute
  private maxOrdersPerWindow: number = 50;
  private orderCount: number = 0;
  private orderResetTimeout?: NodeJS.Timeout;
  private retryDelayMs: number = 1000;
  private maxRetries: number = 3;

  constructor(baseUrl: string, apiKey?: string) {
    this.baseUrl = baseUrl;
    this.apiKey = apiKey;
    this.initializeRateLimiting();
  }

  private initializeRateLimiting(): void {
    this.orderResetTimeout = setInterval(() => {
      this.orderCount = 0;
    }, this.rateLimitWindowMs);
  }

  private async checkRateLimit(): Promise<void> {
    if (this.orderCount >= this.maxOrdersPerWindow) {
      throw new Error('Order rate limit exceeded. Please try again later.');
    }
    this.orderCount++;
  }

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };
    if (this.apiKey) {
      headers['X-API-Key'] = this.apiKey;
    }
    return headers;
  }

  private async retryOperation<T>(
    operation: () => Promise<T>,
    retryCount: number = 0
  ): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      if (error instanceof AxiosError) {
        // Don't retry on certain error codes
        if (error.response?.status === 400 || // Bad request
            error.response?.status === 401 || // Unauthorized
            error.response?.status === 403) { // Forbidden
          throw error;
        }

        // Retry on rate limit with exponential backoff
        if (error.response?.status === 429 && retryCount < this.maxRetries) {
          const delay = this.retryDelayMs * Math.pow(2, retryCount);
          await new Promise(resolve => setTimeout(resolve, delay));
          return this.retryOperation(operation, retryCount + 1);
        }
      }
      throw error;
    }
  }

  async placeOrder(params: OrderParams): Promise<string> {
    await this.checkRateLimit();

    return this.retryOperation(async () => {
      try {
        const response = await axios.post(
          `${this.baseUrl}/order`,
          params,
          { headers: this.getHeaders() }
        );
        return response.data.orderId;
      } catch (error) {
        if (error instanceof AxiosError) {
          switch (error.response?.status) {
            case 400:
              throw new Error(`Invalid order parameters: ${error.response.data.message}`);
            case 401:
              throw new Error('Unauthorized: Invalid API key');
            case 403:
              throw new Error('Forbidden: Insufficient permissions');
            case 429:
              throw new Error('Rate limit exceeded. Please try again later.');
            case 500:
              throw new Error('Internal server error. Please try again later.');
            default:
              throw new Error(`Failed to place order: ${error.message}`);
          }
        }
        throw error;
      }
    });
  }

  async cancelOrder(exchange: string, orderId: string): Promise<boolean> {
    await this.checkRateLimit();

    return this.retryOperation(async () => {
      try {
        await axios.delete(`${this.baseUrl}/order/${exchange}/${orderId}`, {
          headers: this.getHeaders()
        });
        return true;
      } catch (error) {
        if (error instanceof AxiosError) {
          switch (error.response?.status) {
            case 404:
              throw new Error(`Order ${orderId} not found`);
            case 401:
              throw new Error('Unauthorized: Invalid API key');
            case 403:
              throw new Error('Forbidden: Insufficient permissions');
            case 429:
              throw new Error('Rate limit exceeded. Please try again later.');
            case 500:
              throw new Error('Internal server error. Please try again later.');
            default:
              throw new Error(`Failed to cancel order: ${error.message}`);
          }
        }
        throw error;
      }
    });
  }

  async getOrder(orderId: string): Promise<OrderParams> {
    return this.retryOperation(async () => {
      try {
        const response = await axios.get(`${this.baseUrl}/order/${orderId}`, {
          headers: this.getHeaders()
        });
        return response.data;
      } catch (error) {
        if (error instanceof AxiosError) {
          switch (error.response?.status) {
            case 404:
              throw new Error(`Order ${orderId} not found`);
            case 401:
              throw new Error('Unauthorized: Invalid API key');
            case 403:
              throw new Error('Forbidden: Insufficient permissions');
            case 429:
              throw new Error('Rate limit exceeded. Please try again later.');
            default:
              throw new Error(`Failed to get order: ${error.message}`);
          }
        }
        throw error;
      }
    });
  }

  async getOpenOrders(exchange: string, symbol?: string): Promise<OrderParams[]> {
    return this.retryOperation(async () => {
      try {
        const response = await axios.get(`${this.baseUrl}/orders`, {
          params: { exchange, symbol },
          headers: this.getHeaders()
        });
        return response.data;
      } catch (error) {
        if (error instanceof AxiosError) {
          switch (error.response?.status) {
            case 401:
              throw new Error('Unauthorized: Invalid API key');
            case 403:
              throw new Error('Forbidden: Insufficient permissions');
            case 429:
              throw new Error('Rate limit exceeded. Please try again later.');
            default:
              throw new Error(`Failed to get open orders: ${error.message}`);
          }
        }
        throw error;
      }
    });
  }

  /**
   * Gets the current status of an order
   * @param exchange Exchange identifier
   * @param orderId Order ID to get status for
   * @returns Order status
   */
  async getOrderStatus(exchange: string, orderId: string): Promise<any> {
    return this.retryOperation(async () => {
      try {
        const response = await axios.get(`${this.baseUrl}/order/${exchange}/${orderId}/status`, {
          headers: this.getHeaders()
        });
        return response.data;
      } catch (error) {
        if (error instanceof AxiosError) {
          switch (error.response?.status) {
            case 404:
              throw new Error(`Order ${orderId} not found`);
            case 401:
              throw new Error('Unauthorized: Invalid API key');
            case 403:
              throw new Error('Forbidden: Insufficient permissions');
            case 429:
              throw new Error('Rate limit exceeded. Please try again later.');
            default:
              throw new Error(`Failed to get order status: ${error.message}`);
          }
        }
        throw error;
      }
    });
  }

  dispose(): void {
    if (this.orderResetTimeout) {
      clearInterval(this.orderResetTimeout);
    }
  }
}
