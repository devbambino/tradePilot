import { StakingPlatform } from './interfaces/stakingPlatform.ts';
import platformAddresses from './stakingPoolAddresses.json';

type PlatformType = 'TON_POOLS' | 'TON_WHALES';

export class PlatformFactory {
  private static strategies = new Map<PlatformType, StakingPlatform>();
  
  static register(type: PlatformType, strategy: StakingPlatform): void {
    this.strategies.set(type, strategy);
  }

  static getStrategy(address: string): StakingPlatform {
    const type = this.getPlatformType(address);
    if (!type) {
      throw new Error(`Unknown platform address: ${address}`);
    }

    const strategy = this.strategies.get(type);
    if (!strategy) {
      throw new Error(`No strategy implemented for platform: ${type}`);
    }

    return strategy;
  }

  private static getPlatformType(address: string): PlatformType | null {
    if (platformAddresses.TON_POOLS.includes(address)) {
      return 'TON_POOLS';
    }
    if (platformAddresses.TON_WHALES.includes(address)) {
      return 'TON_WHALES';
    }
    return null;
  }
}