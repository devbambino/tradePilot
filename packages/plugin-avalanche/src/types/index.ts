import { z } from "zod";
import { Address } from "viem";

export interface YakSwapQuote {
    amounts: bigint[];
    adapters: Address[];
    path: Address[];
    gasEstimate: bigint;
}

// struct MarketCreationParameters {
//     uint96 tokenType;
//     string name;
//     string symbol;
//     address quoteToken;
//     uint256 totalSupply;
//     uint16 creatorShare;
//     uint16 stakingShare;
//     uint256[] bidPrices;
//     uint256[] askPrices;
//     bytes args;
// }
export interface TokenMillMarketCreationParameters {
    tokenType: number;
    name: string;
    symbol: string;
    quoteToken: Address;
    totalSupply: bigint;
    creatorShare: number;
    stakingShare: number;
    bidPrices: bigint[];
    askPrices: bigint[];
    args: string;
}

export const TokenMillCreateContentSchema = z.object({
    name: z.string(),
    symbol: z.string(),
});

export interface TokenMillCreateContent {
    name: string;
    symbol: string;
}

export const isTokenMillCreateContent = (
    object: any
): object is TokenMillCreateContent => {
    if (TokenMillCreateContentSchema.safeParse(object).success) {
        return true;
    }
    console.error("Invalid content: ", object);
    return false;
};

export const TransferSchema = z.object({
    tokenAddress: z.string(),
    recipient: z.string(),
    amount: z.union([z.string(), z.number()]),
});

export interface TransferContent {
    tokenAddress: string;
    recipient: string;
    amount: string | number;
}

export const isTransferContent = (object: any): object is TransferContent => {
    return TransferSchema.safeParse(object).success;
};

export interface StrategyContent {
    depositTokenAddress: string;
    strategyAddress: string;
    amount: string | number;
}

export const StrategySchema = z.object({
    depositTokenAddress: z.string(),
    strategyAddress: z.string(),
    amount: z.union([z.string(), z.number()]),
});

export const isStrategyContent = (object: any): object is StrategyContent => {
    return StrategySchema.safeParse(object).success;
};

export interface SwapContent {
    fromTokenAddress: string;
    toTokenAddress: string;
    recipient?: string;
    amount: string | number;
}

export const SwapSchema = z.object({
    fromTokenAddress: z.string(),
    toTokenAddress: z.string(),
    recipient: z.string().optional(),
    amount: z.union([z.string(), z.number()]),
});

export const isSwapContent = (object: any): object is SwapContent => {
    return SwapSchema.safeParse(object).success;
};
