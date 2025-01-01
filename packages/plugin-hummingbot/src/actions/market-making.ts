import { HummingbotPlugin } from '..';
import { SimpleMarketMaking } from '../strategies/simple-market-making';
import { MarketMakingConfig } from '../types';

export async function startMarketMaking(
  plugin: HummingbotPlugin,
  config: MarketMakingConfig
): Promise<() => Promise<void>> {
  const strategy = new SimpleMarketMaking(plugin, config);
  return strategy.start();
}

export async function stopMarketMaking(
  plugin: HummingbotPlugin,
  strategyId: string
): Promise<void> {
  await plugin.stopStrategy(strategyId);
}

export async function getMarketMakingStatus(
  plugin: HummingbotPlugin,
  strategyId: string
): Promise<any> {
  return plugin.getStrategyStatus(strategyId);
}
