import { z } from "zod";
import type { Token } from "@lifi/types";
import type {
    Account,
    Address,
    Chain,
    Hash,
    HttpTransport,
    PublicClient,
    WalletClient,
} from "viem";
import * as viemChains from "viem/chains";

const _SupportedChainList = Object.keys(viemChains) as Array<
    keyof typeof viemChains
>;
export type SupportedChain = (typeof _SupportedChainList)[number];

// Transaction types
export interface Transaction {
    hash: Hash;
    from: Address;
    to: Address;
    value: bigint;
    data?: `0x${string}`;
    chainId?: number;
}

// Token types
export interface TokenWithBalance {
    token: Token;
    balance: bigint;
    formattedBalance: string;
    priceUSD: string;
    valueUSD: string;
}

export interface WalletBalance {
    chain: SupportedChain;
    address: Address;
    totalValueUSD: string;
    tokens: TokenWithBalance[];
}

// Chain configuration
export interface ChainMetadata {
    chainId: number;
    name: string;
    chain: Chain;
    rpcUrl: string;
    nativeCurrency: {
        name: string;
        symbol: string;
        decimals: number;
    };
    blockExplorerUrl: string;
}

export interface ChainConfig {
    chain: Chain;
    publicClient: PublicClient<HttpTransport, Chain, Account | undefined>;
    walletClient?: WalletClient;
}

// Action parameters
export interface TransferParams {
    fromChain: SupportedChain;
    toAddress: Address;
    amount: string;
    data?: `0x${string}`;
}

export const TransferParamsSchema = z.object({
    fromChain: z
        .string()
        .refine((value) => _SupportedChainList.includes(value as any)),
    toAddress: z.string(),
    amount: z.string(),
    data: z.string().optional(),
});

export const isTransferParams = (object: any): object is TransferParams => {
    return TransferParamsSchema.safeParse(object).success;
};

export interface SwapParams {
    chain: SupportedChain;
    fromToken: Address;
    toToken: Address;
    amount: string;
    slippage?: number;
}

export const SwapParamsSchema = z.object({
    chain: z
        .string()
        .refine((value) => _SupportedChainList.includes(value as any)),
    fromToken: z.string(),
    toToken: z.string(),
    amount: z.string(),
    slippage: z.number().optional(),
});

export const isSwapParams = (object: any): object is SwapParams => {
    return SwapParamsSchema.safeParse(object).success;
};

export interface BridgeParams {
    fromChain: SupportedChain;
    toChain: SupportedChain;
    fromToken: Address;
    toToken: Address;
    amount: string;
    toAddress?: Address;
}

export const BridgeParamsSchema = z.object({
    fromChain: z
        .string()
        .refine((value) => _SupportedChainList.includes(value as any)),
    toChain: z
        .string()
        .refine((value) => _SupportedChainList.includes(value as any)),
    fromToken: z.string(),
    toToken: z.string(),
    amount: z.string(),
    toAddress: z.string().optional(),
});

export const isBridgeParams = (object: any): object is BridgeParams => {
    return BridgeParamsSchema.safeParse(object).success;
};

// Plugin configuration
export interface EvmPluginConfig {
    rpcUrl?: {
        ethereum?: string;
        abstract?: string;
        base?: string;
        sepolia?: string;
        bsc?: string;
        arbitrum?: string;
        avalanche?: string;
        polygon?: string;
        optimism?: string;
        cronos?: string;
        gnosis?: string;
        fantom?: string;
        klaytn?: string;
        celo?: string;
        moonbeam?: string;
        aurora?: string;
        harmonyOne?: string;
        moonriver?: string;
        arbitrumNova?: string;
        mantle?: string;
        linea?: string;
        scroll?: string;
        filecoin?: string;
        taiko?: string;
        zksync?: string;
        canto?: string;
        alienx?: string;
    };
    secrets?: {
        EVM_PRIVATE_KEY: string;
    };
    testMode?: boolean;
    multicall?: {
        batchSize?: number;
        wait?: number;
    };
}

// LiFi types
export type LiFiStatus = {
    status: "PENDING" | "DONE" | "FAILED";
    substatus?: string;
    error?: Error;
};

export type LiFiRoute = {
    transactionHash: Hash;
    transactionData: `0x${string}`;
    toAddress: Address;
    status: LiFiStatus;
};

// Provider types
export interface TokenData extends Token {
    symbol: string;
    decimals: number;
    address: Address;
    name: string;
    logoURI?: string;
    chainId: number;
}

export interface TokenPriceResponse {
    priceUSD: string;
    token: TokenData;
}

export interface TokenListResponse {
    tokens: TokenData[];
}

export interface ProviderError extends Error {
    code?: number;
    data?: unknown;
}
