import { IAgentRuntime } from "@elizaos/core";
import { API } from "@orderly.network/types";
import * as viemChains from "viem/chains";
import { z } from "zod";

type Chain = {
    network: "mainnet" | "testnet";
    id: string;
    label: string;
};

declare const _SupportedEvmChainList: Array<keyof typeof viemChains>;
type AllSupportedEvmChains = (typeof _SupportedEvmChainList)[number];
export type SupportedEvmChain =
    | (AllSupportedEvmChains & "mainnet")
    | "arbitrum"
    | "optimism"
    | "base"
    | "mantle"
    | "sei"
    | "avalanche"
    | "sepolia"
    | "arbitrumSepolia"
    | "optimismSepolia"
    | "baseSepolia"
    | "mantleSepoliaTestnet"
    | "seiDevnet"
    | "avalancheFuji";

export const supportedEvmChainIdsSchema = z.enum([
    "mainnet",
    "arbitrum",
    "optimism",
    "base",
    "mantle",
    "sei",
    "avalanche",
    "sepolia",
    "arbitrumSepolia",
    "optimismSepolia",
    "baseSepolia",
    "mantleSepoliaTestnet",
    "seiDevnet",
    "avalancheFuji",
]);
export const supportedEvmChainIds = supportedEvmChainIdsSchema.options;

export const supportedEvmChains: Record<SupportedEvmChain, Chain> = {
    mainnet: {
        network: "mainnet",
        id: "0x1",
        label: "Ethereum",
    },
    arbitrum: {
        network: "mainnet",
        id: "0xa4b1",
        label: "Arbitrum One",
    },
    optimism: {
        network: "mainnet",
        id: "0xa",
        label: "OP Mainnet",
    },
    base: {
        network: "mainnet",
        id: "0x2105",
        label: "Base",
    },
    mantle: {
        network: "mainnet",
        id: "0x1388",
        label: "Mantle",
    },
    sei: {
        network: "mainnet",
        id: "0x531",
        label: "Sei",
    },
    avalanche: {
        network: "mainnet",
        id: "0xa86a",
        label: "Avalanche",
    },
    sepolia: {
        network: "testnet",
        id: "0xaa36a7",
        label: "Sepolia",
    },
    arbitrumSepolia: {
        network: "testnet",
        id: "0x66eee",
        label: "Arbitrum Sepolia",
    },
    optimismSepolia: {
        network: "testnet",
        id: "0xaa37dc",
        label: "OP Sepolia",
    },
    baseSepolia: {
        network: "testnet",
        id: "0x14a34",
        label: "Base Sepolia",
    },
    mantleSepoliaTestnet: {
        network: "testnet",
        id: "0x138b",
        label: "Mantle Sepolia",
    },
    seiDevnet: {
        network: "testnet",
        id: "0xae3f3",
        label: "Sei Devnet",
    },
    avalancheFuji: {
        network: "testnet",
        id: "0xa869",
        label: "Avalanche Fuji",
    },
};

export function getAllowedEvmChains(runtime: IAgentRuntime): string[] {
    const chains =
        (runtime.character.settings?.chains?.evm as SupportedEvmChain[]) || [];
    const network = runtime.getSetting("ORDERLY_NETWORK") as
        | "mainnet"
        | "testnet";
    return chains
        .filter((chain) =>
            supportedEvmChainIds.includes(chain as SupportedEvmChain)
        )
        .filter(
            (chain) =>
                supportedEvmChains[chain as SupportedEvmChain].network ===
                network
        );
}

export const solanaChainInfo: API.NetworkInfos = {
    name: "Solana",
    public_rpc_url: "https://api.mainnet-beta.solana.com",
    chain_id: 900900900,
    currency_symbol: "SOL",
    explorer_base_url: "https://explorer.solana.com",
    shortName: "Solana",
    bridge_enable: true,
    mainnet: true,
    est_txn_mins: null,
};
export const solanaDevnetChainInfo: API.NetworkInfos = {
    name: "Solana",
    public_rpc_url: "https://api.devnet.solana.com",
    chain_id: 901901901,
    currency_symbol: "SOL",
    explorer_base_url: "https://explorer.solana.com/?cluster=devnet",
    shortName: "Solana",
    bridge_enable: true,
    mainnet: false,
    est_txn_mins: null,
};
