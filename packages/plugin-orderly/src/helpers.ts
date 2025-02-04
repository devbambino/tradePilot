import { match } from "ts-pattern";
import { bytesToHex, encodeAbiParameters, encodePacked } from "viem";
import bs58 from "bs58";

import {
    solanaChainInfo,
    solanaDevnetChainInfo,
    SupportedEvmChain,
    supportedEvmChains,
} from "./network";
import { Address, keccak256 } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { IAgentRuntime } from "@elizaos/core";
import { signAsync } from "@noble/ed25519";
import { getPublicKeyAsync } from "@noble/ed25519";
import { API, OrderEntity } from "@orderly.network/types";
import { DefaultSolanaWalletAdapter } from "@orderly.network/default-solana-adapter";
import {
    clusterApiUrl,
    Connection,
    PublicKey,
    VersionedTransaction,
} from "@solana/web3.js";
import { Keypair } from "@solana/web3.js";
import { initWalletProvider } from "@elizaos/plugin-evm";

export const MESSAGE_TYPES = {
    EIP712Domain: [
        { name: "name", type: "string" },
        { name: "version", type: "string" },
        { name: "chainId", type: "uint256" },
        { name: "verifyingContract", type: "address" },
    ],
    Registration: [
        { name: "brokerId", type: "string" },
        { name: "chainId", type: "uint256" },
        { name: "timestamp", type: "uint64" },
        { name: "registrationNonce", type: "uint256" },
    ],
    AddOrderlyKey: [
        { name: "brokerId", type: "string" },
        { name: "chainId", type: "uint256" },
        { name: "orderlyKey", type: "string" },
        { name: "scope", type: "string" },
        { name: "timestamp", type: "uint64" },
        { name: "expiration", type: "uint64" },
    ],
    Withdraw: [
        { name: "brokerId", type: "string" },
        { name: "chainId", type: "uint256" },
        { name: "receiver", type: "address" },
        { name: "token", type: "string" },
        { name: "amount", type: "uint256" },
        { name: "withdrawNonce", type: "uint64" },
        { name: "timestamp", type: "uint64" },
    ],
    SettlePnl: [
        { name: "brokerId", type: "string" },
        { name: "chainId", type: "uint256" },
        { name: "settleNonce", type: "uint64" },
        { name: "timestamp", type: "uint64" },
    ],
    DelegateSigner: [
        { name: "delegateContract", type: "address" },
        { name: "brokerId", type: "string" },
        { name: "chainId", type: "uint256" },
        { name: "timestamp", type: "uint64" },
        { name: "registrationNonce", type: "uint256" },
        { name: "txHash", type: "bytes32" },
    ],
    DelegateAddOrderlyKey: [
        { name: "delegateContract", type: "address" },
        { name: "brokerId", type: "string" },
        { name: "chainId", type: "uint256" },
        { name: "orderlyKey", type: "string" },
        { name: "scope", type: "string" },
        { name: "timestamp", type: "uint64" },
        { name: "expiration", type: "uint64" },
    ],
    DelegateWithdraw: [
        { name: "delegateContract", type: "address" },
        { name: "brokerId", type: "string" },
        { name: "chainId", type: "uint256" },
        { name: "receiver", type: "address" },
        { name: "token", type: "string" },
        { name: "amount", type: "uint256" },
        { name: "withdrawNonce", type: "uint64" },
        { name: "timestamp", type: "uint64" },
    ],
    DelegateSettlePnl: [
        { name: "delegateContract", type: "address" },
        { name: "brokerId", type: "string" },
        { name: "chainId", type: "uint256" },
        { name: "settleNonce", type: "uint64" },
        { name: "timestamp", type: "uint64" },
    ],
};

export function isTestnet(chain: SupportedEvmChain): boolean {
    return supportedEvmChains[chain]?.network === "testnet";
}

export function getChainId(chain: SupportedEvmChain): string {
    return supportedEvmChains[chain].id;
}

export function getEvmVaultAddress(chainId: SupportedEvmChain): Address {
    return match(chainId)
        .with("mainnet", () => "0x816f722424b49cf1275cc86da9840fbd5a6167e9")
        .with("arbitrum", () => "0x816f722424B49Cf1275cc86DA9840Fbd5a6167e9")
        .with("optimism", () => "0x816f722424b49cf1275cc86da9840fbd5a6167e9")
        .with("base", () => "0x816f722424b49cf1275cc86da9840fbd5a6167e9")
        .with("mantle", () => "0x816f722424b49cf1275cc86da9840fbd5a6167e9")
        .with("sei", () => "0x816f722424B49Cf1275cc86DA9840Fbd5a6167e9")
        .with("avalanche", () => "0x816f722424b49cf1275cc86da9840fbd5a6167e9")
        .with("sepolia", () => "0x0EaC556c0C2321BA25b9DC01e4e3c95aD5CDCd2f")
        .with(
            "arbitrumSepolia",
            () => "0x0EaC556c0C2321BA25b9DC01e4e3c95aD5CDCd2f"
        )
        .with(
            "optimismSepolia",
            () => "0xEfF2896077B6ff95379EfA89Ff903598190805EC"
        )
        .with("baseSepolia", () => "0xdc7348975aE9334DbdcB944DDa9163Ba8406a0ec")
        .with(
            "mantleSepoliaTestnet",
            () => "0xfb0E5f3D16758984E668A3d76f0963710E775503"
        )
        .with("seiDevnet", () => "0xA603f6e124259d37e43dd5008cB7613164D6a6e3")
        .with(
            "avalancheFuji",
            () => "0xAB6c8F6245B67421302AAe30AcEB10E00c30F463"
        )
        .exhaustive() as Address;
}

export function getSolanaVaultAddress(
    network: "mainnet" | "testnet"
): PublicKey {
    return match(network)
        .with(
            "mainnet",
            () => new PublicKey("ErBmAD61mGFKvrFNaTJuxoPwqrS8GgtwtqJTJVjFWx9Q")
        )
        .with(
            "testnet",
            () => new PublicKey("9shwxWDUNhtwkHocsUAmrNAQfBH2DHh4njdAEdHZZkF2")
        )
        .exhaustive();
}

export function getVerifyingAddress(network: "mainnet" | "testnet"): string {
    return match(network)
        .with("mainnet", () => "0x6F7a338F2aA472838dEFD3283eB360d4Dff5D203")
        .with("testnet", () => "0x1826B75e2ef249173FC735149AE4B8e9ea10abff")
        .exhaustive();
}

export function getEvmUSDCAddress(chain: SupportedEvmChain): Address {
    return match(chain)
        .with("mainnet", () => "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48")
        .with("arbitrum", () => "0xaf88d065e77c8cC2239327C5EDb3A432268e5831")
        .with("optimism", () => "0x0b2c639c533813f4aa9d7837caf62653d097ff85")
        .with("base", () => "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913")
        .with("mantle", () => "0x09bc4e0d864854c6afb6eb9a9cdf58ac190d0df9")
        .with("sei", () => "0x3894085Ef7Ff0f0aeDf52E2A2704928d1Ec074F1")
        .with("avalanche", () => "0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E")
        .with("sepolia", () => "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238")
        .with(
            "arbitrumSepolia",
            () => "0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d"
        )
        .with(
            "optimismSepolia",
            () => "0x5fd84259d66Cd46123540766Be93DFE6D43130D7"
        )
        .with("baseSepolia", () => "0x036CbD53842c5426634e7929541eC2318f3dCF7e")
        .with(
            "mantleSepoliaTestnet",
            () => "0xAcab8129E2cE587fD203FD770ec9ECAFA2C88080"
        )
        .with("seiDevnet", () => "0xd5164A5a83c64E59F842bC091E06614b84D95fF5")
        .with(
            "avalancheFuji",
            () => "0x5425890298aed601595a70ab815c96711a31bc65"
        )
        .exhaustive() as Address;
}

export function getSolanaUSDCAddress(
    network: "mainnet" | "testnet"
): PublicKey {
    return match(network)
        .with(
            "mainnet",
            () => new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v")
        )
        .with(
            "testnet",
            () => new PublicKey("4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU")
        )
        .exhaustive();
}

export function getBaseUrlFromNetwork(network: "mainnet" | "testnet"): string {
    return match(network)
        .with("mainnet", () => "https://api-evm.orderly.org")
        .with("testnet", () => "https://testnet-api-evm.orderly.org")
        .exhaustive();
}

export type EIP712Domain = {
    name: string;
    version: string;
    chainId: number;
    verifyingContract: string;
};

export function getOffChainDomain(chain: SupportedEvmChain): EIP712Domain {
    return {
        name: "Orderly",
        version: "1",
        chainId: Number(getChainId(chain)),
        verifyingContract: "0xCcCCccccCCCCcCCCCCCcCcCccCcCCCcCcccccccC",
    };
}

export function getOnChainDomain(
    network: "mainnet" | "testnet",
    chain: SupportedEvmChain
): EIP712Domain {
    return {
        name: "Orderly",
        version: "1",
        chainId: Number(getChainId(chain)),
        verifyingContract: getVerifyingAddress(network),
    };
}

export async function getAccountId(runtime: IAgentRuntime) {
    const brokerId = runtime.getSetting("ORDERLY_BROKER_ID");
    if (!brokerId) {
        throw new Error("ORDERLY_BROKER_ID is not set");
    }
    const network = runtime.getSetting("ORDERLY_NETWORK") as
        | "mainnet"
        | "testnet";
    const chainMode = runtime.getSetting("ORDERLY_CHAIN_MODE") as
        | "solana"
        | "evm";
    const address = await match(chainMode)
        .with("evm", async () => {
            const walletProvider = await initWalletProvider(runtime);
            return walletProvider.getAddress();
        })
        .with("solana", async () => {
            const privateKeyString = runtime.getSetting("SOLANA_PRIVATE_KEY");
            if (!privateKeyString) {
                throw new Error("SOLANA_PRIVATE_KEY is not set");
            }
            const privateKeyBytes = bs58.decode(privateKeyString);
            const senderKeypair = Keypair.fromSecretKey(privateKeyBytes);

            return senderKeypair.publicKey.toBase58();
        })
        .exhaustive();
    const isSol = !!address.match(/^[0-9a-zA-Z]{44}$/);
    if (isSol) {
        return fetch(
            `${getBaseUrlFromNetwork(
                network
            )}/v1/get_account?address=${address}&broker_id=${brokerId}&chain_type=SOL`
        )
            .then((res) => res.json())
            .then((json) => json.data.account_id as string);
    }
    return keccak256(
        encodeAbiParameters(
            [{ type: "address" }, { type: "bytes32" }],
            [
                address as Address,
                keccak256(encodePacked(["string"], [brokerId])),
            ]
        )
    );
}

export async function getOrderlyKey(
    runtime: IAgentRuntime
): Promise<Uint8Array> {
    const orderlyKey = runtime.getSetting(
        "ORDERLY_PRIVATE_KEY"
    ) as `ed25519:${string}`;
    if (!orderlyKey) {
        throw new Error("ORDERLY_PRIVATE_KEY is not set");
    }
    return bs58.decode(orderlyKey.substring(8));
}

export async function signAndSendRequest(
    accountId: string,
    orderlyKey: Uint8Array,
    input: URL | string,
    init?: RequestInit | undefined
): Promise<Response> {
    const timestamp = Date.now();
    const encoder = new TextEncoder();

    const url = new URL(input);
    let message = `${String(timestamp)}${init?.method ?? "GET"}${url.pathname}${
        url.search
    }`;
    if (init?.body) {
        message += init.body;
    }
    const orderlySignature = await signAsync(
        encoder.encode(message),
        orderlyKey
    );

    return fetch(input, {
        headers: {
            "Content-Type":
                init?.method !== "GET" && init?.method !== "DELETE"
                    ? "application/json"
                    : "application/x-www-form-urlencoded",
            "orderly-timestamp": String(timestamp),
            "orderly-account-id": accountId,
            "orderly-key": `ed25519:${bs58.encode(
                await getPublicKeyAsync(orderlyKey)
            )}`,
            "orderly-signature": base64EncodeURL(orderlySignature),
            ...(init?.headers ?? {}),
        },
        ...(init ?? {}),
    });
}

export async function withdrawUSDCFromOrderly(
    runtime: IAgentRuntime,
    chain: SupportedEvmChain,
    brokerId: string,
    accountId: string,
    orderlyKey: Uint8Array,
    amount: string
): Promise<void> {
    const network = runtime.getSetting("ORDERLY_NETWORK") as
        | "mainnet"
        | "testnet";
    const nonceRes = await signAndSendRequest(
        accountId,
        orderlyKey,
        `${getBaseUrlFromNetwork(network)}/v1/withdraw_nonce`
    );
    const nonceJson = await nonceRes.json();
    const withdrawNonce = nonceJson.data.withdraw_nonce as string;

    const chainMode = runtime.getSetting("ORDERLY_CHAIN_MODE") as
        | "solana"
        | "evm";

    const [message, signature, address] = await match(chainMode)
        .with("evm", () => {
            const PRIVATE_KEY = runtime.getSetting("EVM_PRIVATE_KEY")!;
            const account = privateKeyToAccount(PRIVATE_KEY as `0x${string}`);

            const withdrawMessage = {
                brokerId,
                chainId: Number(supportedEvmChains[chain].id),
                receiver: account.address,
                token: "USDC",
                amount: Number(amount),
                timestamp: Date.now(),
                withdrawNonce,
            };
            return [
                withdrawMessage,
                account.signTypedData({
                    message: withdrawMessage,
                    primaryType: "Withdraw",
                    types: MESSAGE_TYPES,
                    domain: getOnChainDomain(network, chain) as any,
                }),
                account.address,
            ];
        })
        .with("solana", async () => {
            const privateKeyString = runtime.getSetting("SOLANA_PRIVATE_KEY");
            if (!privateKeyString) {
                throw new Error("SOLANA_PRIVATE_KEY is not set");
            }
            const privateKeyBytes = bs58.decode(privateKeyString);
            const senderKeypair = Keypair.fromSecretKey(privateKeyBytes);
            const address = senderKeypair.publicKey.toBase58();

            const connection = new Connection(
                match(network)
                    .with("mainnet", () => clusterApiUrl("mainnet-beta"))
                    .with("testnet", () => clusterApiUrl("devnet"))
                    .exhaustive()
            );

            const walletAdapter = new DefaultSolanaWalletAdapter();
            walletAdapter.active({
                address,
                provider: {
                    connection,
                    signMessage: async (msg) =>
                        signAsync(msg, privateKeyBytes.slice(0, 32)),
                    sendTransaction: (tx: VersionedTransaction, conn) => {
                        tx.sign([senderKeypair]);
                        return conn.sendTransaction(tx);
                    },
                },
                chain: match(network)
                    .with("mainnet", () => ({
                        id: solanaChainInfo.chain_id,
                    }))
                    .with("testnet", () => ({
                        id: solanaDevnetChainInfo.chain_id,
                    }))
                    .exhaustive(),
            });

            const withdrawMessage = await walletAdapter.generateWithdrawMessage(
                {
                    brokerId,
                    receiver: address,
                    token: "USDC",
                    amount: amount,
                    timestamp: Date.now(),
                    nonce: Number(withdrawNonce),
                }
            );
            return [
                withdrawMessage.message,
                withdrawMessage.signatured,
                address,
            ];
        })
        .exhaustive();

    const res = await signAndSendRequest(
        accountId,
        orderlyKey,
        `${getBaseUrlFromNetwork(network)}/v1/withdraw_request`,
        {
            method: "POST",
            body: JSON.stringify({
                message,
                signature,
                userAddress: address,
                verifyingContract: getVerifyingAddress(network),
            }),
        }
    );
    const withdrawJson = await res.json();
    if (!withdrawJson.success) {
        throw new Error(withdrawJson.message);
    }
}

export async function settlePnlFromOrderly(
    runtime: IAgentRuntime,
    chain: SupportedEvmChain,
    brokerId: string,
    accountId: string,
    orderlyKey: Uint8Array
): Promise<void> {
    const network = runtime.getSetting("ORDERLY_NETWORK") as
        | "mainnet"
        | "testnet";
    const nonceRes = await signAndSendRequest(
        accountId,
        orderlyKey,
        `${getBaseUrlFromNetwork(network)}/v1/settle_nonce`
    );
    const nonceJson = await nonceRes.json();
    const settleNonce = nonceJson.data.settle_nonce as string;

    const chainMode = runtime.getSetting("ORDERLY_CHAIN_MODE") as
        | "solana"
        | "evm";

    const [message, signature, address] = await match(chainMode)
        .with("evm", () => {
            const PRIVATE_KEY = runtime.getSetting("EVM_PRIVATE_KEY")!;
            const account = privateKeyToAccount(PRIVATE_KEY as `0x${string}`);

            const settlePnlMessage = {
                brokerId,
                chainId: Number(supportedEvmChains[chain].id),
                settleNonce,
                timestamp: Date.now(),
            };
            return [
                settlePnlMessage,
                account.signTypedData({
                    message: settlePnlMessage,
                    primaryType: "SettlePnl",
                    types: MESSAGE_TYPES,
                    domain: getOnChainDomain(network, chain) as any,
                }),
                account.address,
            ];
        })
        .with("solana", async () => {
            const privateKeyString = runtime.getSetting("SOLANA_PRIVATE_KEY");
            if (!privateKeyString) {
                throw new Error("SOLANA_PRIVATE_KEY is not set");
            }
            const privateKeyBytes = bs58.decode(privateKeyString);
            const senderKeypair = Keypair.fromSecretKey(privateKeyBytes);
            const address = senderKeypair.publicKey.toBase58();

            const connection = new Connection(
                match(network)
                    .with("mainnet", () => clusterApiUrl("mainnet-beta"))
                    .with("testnet", () => clusterApiUrl("devnet"))
                    .exhaustive()
            );

            const walletAdapter = new DefaultSolanaWalletAdapter();
            walletAdapter.active({
                address,
                provider: {
                    connection,
                    signMessage: async (msg) =>
                        signAsync(msg, privateKeyBytes.slice(0, 32)),
                    sendTransaction: (tx: VersionedTransaction, conn) => {
                        tx.sign([senderKeypair]);
                        return conn.sendTransaction(tx);
                    },
                },
                chain: match(network)
                    .with("mainnet", () => ({
                        id: solanaChainInfo.chain_id,
                    }))
                    .with("testnet", () => ({
                        id: solanaDevnetChainInfo.chain_id,
                    }))
                    .exhaustive(),
            });

            const settlePnlMessage = await walletAdapter.generateSettleMessage({
                brokerId,
                timestamp: Date.now(),
                settlePnlNonce: settleNonce,
            });
            return [
                settlePnlMessage.message,
                settlePnlMessage.signatured,
                address,
            ];
        })
        .exhaustive();

    const res = await signAndSendRequest(
        accountId,
        orderlyKey,
        `${getBaseUrlFromNetwork(network)}/v1/settle_pnl`,
        {
            method: "POST",
            body: JSON.stringify({
                message,
                signature,
                userAddress: address,
                verifyingContract: getVerifyingAddress(network),
            }),
        }
    );
    const withdrawJson = await res.json();
    if (!withdrawJson.success) {
        throw new Error(withdrawJson.message);
    }
}

export async function getClientHolding(
    network: "mainnet" | "testnet",
    accountId: string,
    orderlyKey: Uint8Array
): Promise<number> {
    const res = await signAndSendRequest(
        accountId,
        orderlyKey,
        `${getBaseUrlFromNetwork(network)}/v1/client/holding`
    );
    if (!res.ok) {
        throw new Error(`Could not fetch client holding: ${await res.text()}`);
    }
    const json = await res.json();
    if (!json.success) {
        throw new Error(json.message);
    }
    const holdings = json.data.holding as API.Holding[];
    return holdings.find(({ token }) => token === "USDC")?.holding ?? 0;
}

export async function getOrders(
    network: "mainnet" | "testnet",
    accountId: string,
    orderlyKey: Uint8Array,
    status: "COMPLETED" | "INCOMPLETE"
): Promise<API.Order[]> {
    const res = await signAndSendRequest(
        accountId,
        orderlyKey,
        `${getBaseUrlFromNetwork(network)}/v1/orders?status=${status}`
    );
    if (!res.ok) {
        throw new Error(`Could not fetch orders: ${await res.text()}`);
    }
    const json = (await res.json()) as {
        success: boolean;
        message?: string;
        data: { rows: API.Order[] };
    };
    if (!json.success) {
        throw new Error(json.message);
    }
    return json.data.rows;
}

export async function getPositions(
    network: "mainnet" | "testnet",
    accountId: string,
    orderlyKey: Uint8Array
): Promise<API.PositionAggregated & { rows: API.Position[] }> {
    const res = await signAndSendRequest(
        accountId,
        orderlyKey,
        `${getBaseUrlFromNetwork(network)}/v1/positions`
    );
    if (!res.ok) {
        throw new Error(`Could not fetch positions: ${await res.text()}`);
    }
    const json = (await res.json()) as {
        success: boolean;
        message?: string;
        data: API.PositionAggregated & { rows: API.Position[] };
    };
    if (!json.success) {
        throw new Error(json.message);
    }
    return json.data;
}

export async function getPosition(
    network: "mainnet" | "testnet",
    accountId: string,
    orderlyKey: Uint8Array,
    symbol: string
): Promise<API.Position> {
    const res = await signAndSendRequest(
        accountId,
        orderlyKey,
        `${getBaseUrlFromNetwork(network)}/v1/position/${symbol}`
    );
    if (!res.ok) {
        throw new Error(`Could not fetch position: ${await res.text()}`);
    }
    const json = (await res.json()) as {
        success: boolean;
        message?: string;
        data: API.Position;
    };
    if (!json.success) {
        throw new Error(json.message);
    }
    return json.data;
}

export async function createOrderAtOrderly(
    network: "mainnet" | "testnet",
    accountId: string,
    orderlyKey: Uint8Array,
    order: OrderEntity
): Promise<string> {
    const res = await signAndSendRequest(
        accountId,
        orderlyKey,
        `${getBaseUrlFromNetwork(network)}/v1/order`,
        {
            method: "POST",
            body: JSON.stringify(order),
        }
    );
    const json = (await res.json()) as {
        success: boolean;
        message?: string;
        data: { order_id: string };
    };
    if (!json.success) {
        throw new Error(json.message);
    }
    return json.data.order_id;
}

function base64EncodeURL(byteArray: Uint8Array) {
    return btoa(
        Array.from(new Uint8Array(byteArray))
            .map((val) => {
                return String.fromCharCode(val);
            })
            .join("")
    )
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=/g, "");
}

export async function getAllowedSymbols(
    network: "mainnet" | "testnet"
): Promise<string[]> {
    const response = await fetch(
        `${getBaseUrlFromNetwork(network)}/v1/public/info`
    );
    const symbols = (await response.json()) as {
        data: {
            rows: { symbol: string }[];
        };
    };
    return symbols.data.rows.map(({ symbol }) => symbol);
}

export async function getSymbolInfo(
    network: "mainnet" | "testnet",
    symbol: string
): Promise<API.Symbol> {
    const response = await fetch(
        `${getBaseUrlFromNetwork(network)}/v1/public/info/${symbol}`
    );
    const symbols = (await response.json()) as {
        data: API.Symbol;
    };
    return symbols.data;
}
