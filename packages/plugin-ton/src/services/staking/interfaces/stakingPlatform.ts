import { TonClient } from "@ton/ton";

export interface StakingPlatform {
  getPoolInfo(client: TonClient, poolAddress: string): Promise<any>;
  stake(client: TonClient, poolAddress: string, amount: number): Promise<string | null>;
  unstake(client: TonClient, poolAddress: string, amount: number): Promise<string | null>;
}