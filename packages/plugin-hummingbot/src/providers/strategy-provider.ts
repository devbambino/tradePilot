import axios from 'axios';
import { StrategyConfig } from '../types';

export class StrategyService {
  private baseUrl: string;
  private apiKey?: string;

  constructor(baseUrl: string, apiKey?: string) {
    this.baseUrl = baseUrl;
    this.apiKey = apiKey;
  }

  async startStrategy(config: StrategyConfig): Promise<string> {
    try {
      const response = await axios.post(
        `${this.baseUrl}/strategy/start`,
        config,
        {
          headers: this.apiKey ? { 'X-API-Key': this.apiKey } : undefined
        }
      );
      return response.data.strategyId;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to start strategy: ${error.message}`);
      }
      throw new Error('Failed to start strategy: Unknown error');
    }
  }

  async stopStrategy(strategyId: string): Promise<boolean> {
    try {
      await axios.post(
        `${this.baseUrl}/strategy/stop`,
        { strategyId },
        {
          headers: this.apiKey ? { 'X-API-Key': this.apiKey } : undefined
        }
      );
      return true;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to stop strategy: ${error.message}`);
      }
      throw new Error('Failed to stop strategy: Unknown error');
    }
  }

  async getStrategyStatus(strategyId: string): Promise<any> {
    try {
      const response = await axios.get(`${this.baseUrl}/strategy/status`, {
        params: { strategyId },
        headers: this.apiKey ? { 'X-API-Key': this.apiKey } : undefined
      });
      return response.data;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to get strategy status: ${error.message}`);
      }
      throw new Error('Failed to get strategy status: Unknown error');
    }
  }
}
