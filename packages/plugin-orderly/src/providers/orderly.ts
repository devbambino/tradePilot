import {
    elizaLogger,
    IAgentRuntime,
    Memory,
    Provider,
    State,
} from "@elizaos/core";
import { WalletProvider } from "@elizaos/plugin-evm";
import { Chain } from "viem/chains";
import { Address, createPublicClient, erc20Abi } from "viem";
import { http } from "viem";
import {
    getAccountId,
    getClientHolding,
    getOrderlyKey,
    getOrders,
    getPositions,
    getEvmUSDCAddress,
    getSolanaUSDCAddress,
} from "../helpers";
import { SupportedEvmChain, supportedEvmChains } from "../network";
import BigNumber from "bignumber.js";
import { API } from "@orderly.network/types";
import { match } from "ts-pattern";
import { clusterApiUrl, Connection, Keypair } from "@solana/web3.js";
import { getAssociatedTokenAddress, getAccount } from "@solana/spl-token";
import bs58 from "bs58";

const genEvmChainsFromRuntime = (
    runtime: IAgentRuntime
): Record<string, Chain> => {
    const chainNames =
        (runtime.character.settings?.chains?.evm as SupportedEvmChain[]) || [];
    const chains: Record<string, Chain> = {};

    chainNames.forEach((chainName) => {
        const rpcUrl = runtime.getSetting(
            "ETHEREUM_PROVIDER_" + chainName.toUpperCase()
        );
        const chain = WalletProvider.genChainFromName(chainName, rpcUrl);
        chains[chainName] = chain;
    });

    const mainnet_rpcurl = runtime.getSetting("EVM_PROVIDER_URL");
    if (mainnet_rpcurl) {
        const chain = WalletProvider.genChainFromName(
            "mainnet",
            mainnet_rpcurl
        );
        chains["mainnet"] = chain;
    }

    return chains;
};

function getSolanaWalletKeypair(runtime?: IAgentRuntime): Keypair {
    const privateKeyString = runtime?.getSetting("SOLANA_PRIVATE_KEY");
    if (!privateKeyString) {
        throw new Error("No Solana private key configured");
    }

    try {
        const privateKeyBytes = bs58.decode(privateKeyString);
        return Keypair.fromSecretKey(privateKeyBytes);
    } catch (error) {
        elizaLogger.error("Failed to create wallet keypair:", error);
        throw error;
    }
}

function formatOrder(order: API.Order): string {
    return `Order ID: ${order.order_id} - Symbol: ${
        order.symbol.split("_")[1]
    } - Side: ${order.side} - Price: ${order.price} - Quantity: ${
        order.quantity
    } - Status: ${order.status} - Created At: ${new Date(
        order.created_time
    ).toLocaleString()} - Updated At: ${new Date(
        order.updated_time
    ).toLocaleString()}`;
}

function formatPosition(position: API.Position): string {
    return `Symbol: ${position.symbol.split("_")[1]} - Side: ${
        position.position_qty > 0 ? "LONG" : "SHORT"
    } - Avg Open Price: ${position.average_open_price} - Mark Price: ${
        position.mark_price
    } - Quantity: ${Math.abs(
        position.position_qty
    )} - Est. Liquidation Price: ${position.est_liq_price} - 24h pnl: ${
        position.pnl_24_h
    } - Created At: ${new Date(position.timestamp).toLocaleString()}`;
}

const orderlyProvider: Provider = {
    get: async (
        runtime: IAgentRuntime,
        _message: Memory,
        state?: State
    ): Promise<string | null> => {
        try {
            const chainMode = runtime.getSetting("ORDERLY_CHAIN_MODE") as
                | "solana"
                | "evm";
            if (chainMode !== "solana" && chainMode !== "evm") {
                throw new Error(
                    "ORDERLY_CHAIN_MODE is not set. Possible values: solana, evm"
                );
            }
            const network = runtime.getSetting("ORDERLY_NETWORK") as
                | "mainnet"
                | "testnet";
            if (network !== "mainnet" && network !== "testnet") {
                throw new Error(
                    "ORDERLY_NETWORK is not set. Possible values: mainnet, testnet"
                );
            }
            const orderlyKey = await getOrderlyKey(runtime);
            const brokerId = runtime.getSetting("ORDERLY_BROKER_ID");
            if (!brokerId) {
                throw new Error("ORDERLY_BROKER_ID is not set");
            }
            const accountId = await getAccountId(runtime);
            const walletInfo = await match(chainMode)
                .with("evm", async () => {
                    const privateKey = runtime.getSetting(
                        "EVM_PRIVATE_KEY"
                    ) as `0x${string}`;
                    if (!privateKey) {
                        throw new Error("EVM_PRIVATE_KEY is missing");
                    }

                    const chains = genEvmChainsFromRuntime(runtime);
                    const evmProvider = new WalletProvider(
                        privateKey,
                        runtime.cacheManager,
                        chains
                    );

                    const address = evmProvider.getAddress();
                    const chain = evmProvider.getCurrentChain();
                    const balance = await evmProvider.getWalletBalance();
                    const publicClient = createPublicClient({
                        chain,
                        transport: http(),
                    });
                    const chainName = Object.entries(supportedEvmChains).find(
                        ([_, { id }]) => Number(id) === chain.id
                    )?.[0] as SupportedEvmChain | undefined;
                    if (!chainName) {
                        throw new Error("Connected chain not supported");
                    }

                    const usdcBalance = await publicClient.readContract({
                        address: getEvmUSDCAddress(chainName),
                        abi: erc20Abi,
                        functionName: "balanceOf",
                        args: [address],
                    });
                    const walletInfo = `EVM Wallet Address: ${address}\nEVM Wallet ETH Balance (this is NOT the Orderly account balance): ${balance} ${
                        chain.nativeCurrency.symbol
                    }\nEVM Wallet USDC Balance (this is NOT the Orderly account balance): ${new BigNumber(
                        String(usdcBalance)
                    )
                        .dividedBy(new BigNumber(10).pow(6))
                        .toFixed(6)} USDC\nChain ID: ${chain.id}, Name: ${
                        chain.name
                    }`;
                    return walletInfo;
                })
                .with("solana", async () => {
                    const walletKeypair = getSolanaWalletKeypair(runtime);
                    const walletPubKey = walletKeypair.publicKey;
                    const network = runtime.getSetting("ORDERLY_NETWORK") as
                        | "mainnet"
                        | "testnet";
                    const connection = new Connection(
                        match(network)
                            .with("mainnet", () =>
                                clusterApiUrl("mainnet-beta")
                            )
                            .with("testnet", () => clusterApiUrl("devnet"))
                            .exhaustive()
                    );
                    const address = walletPubKey.toBase58();
                    const balance = await connection.getBalance(walletPubKey);
                    const solBalance = balance / 1e9;

                    // Get the associated token account address for USDC
                    let usdcBalance = 0;
                    try {
                        const tokenAddress = await getAssociatedTokenAddress(
                            getSolanaUSDCAddress(network),
                            walletPubKey
                        );
                        const tokenAccount = await getAccount(
                            connection,
                            tokenAddress
                        );
                        usdcBalance = Number(tokenAccount.amount) / 1e6;
                    } catch (error) {
                        console.log("No USDC account found for this wallet");
                    }

                    const walletInfo = `Solana Wallet Address: ${address}\nSolana Wallet SOL Balance (this is NOT the Orderly account balance): ${solBalance} SOL\nSolana Wallet USDC Balance (this is NOT the Orderly account balance): ${usdcBalance.toFixed(
                        6
                    )} USDC`;
                    return walletInfo;
                })
                .exhaustive();

            const orderlyBalance = await getClientHolding(
                network,
                accountId,
                orderlyKey
            );
            const incompleteOrders = await getOrders(
                network,
                accountId,
                orderlyKey,
                "INCOMPLETE"
            );
            const completedOrders = await getOrders(
                network,
                accountId,
                orderlyKey,
                "COMPLETED"
            );

            const positionsAggregated = await getPositions(
                network,
                accountId,
                orderlyKey
            );
            const positionInfo = Object.assign({}, positionsAggregated) as any;
            positionInfo.rows = undefined;
            const positions = positionsAggregated.rows.filter(
                (position) => position.position_qty !== 0
            );

            const leverage =
                1 / positionsAggregated.current_margin_ratio_with_orders;

            const agentName = state?.agentName || "The agent";
            return `${agentName}'s ${walletInfo}\nOrderly account balance (this is the balance that is available for trading on Orderly): ${orderlyBalance} USDC\nIncomplete Orders: ${incompleteOrders
                .map(formatOrder)
                .join("\n")}\nCompleted Orders: ${completedOrders
                .map(formatOrder)
                .join("\n")}\nOpen Positions: ${positions
                .map(formatPosition)
                .join("\n")}\nPosition Info: ${JSON.stringify(
                positionInfo
            )}\nAccount Leverage: ${leverage.toFixed(2)}x`;
        } catch (error) {
            console.error("Error in Orderly wallet provider:", error);
            return null;
        }
    },
};

export { orderlyProvider };
