import {
    ActionExample,
    HandlerCallback,
    IAgentRuntime,
    Memory,
    ModelClass,
    State,
    elizaLogger,
    type Action,
    composeContext,
    generateObject,
} from "@elizaos/core";
import { DefaultSolanaWalletAdapter } from "@orderly.network/default-solana-adapter";
import { solidityPackedKeccak256 } from "ethers";
import {
    getAccountId,
    getEvmUSDCAddress,
    getEvmVaultAddress,
    getSolanaUSDCAddress,
    getSolanaVaultAddress,
} from "../helpers";
import {
    getAllowedEvmChains,
    SupportedEvmChain,
    supportedEvmChainIdsSchema,
    solanaChainInfo,
    solanaDevnetChainInfo,
} from "../network";
import { initWalletProvider } from "@elizaos/plugin-evm";
import { vaultAbi } from "../abi/vault";
import {
    Address,
    createPublicClient,
    encodeFunctionData,
    erc20Abi,
    http,
} from "viem";
import { z } from "zod";
import BigNumber from "bignumber.js";
import { privateKeyToAccount } from "viem/accounts";
import { match } from "ts-pattern";
import bs58 from "bs58";
import {
    Connection,
    Keypair,
    VersionedTransaction,
    clusterApiUrl,
} from "@solana/web3.js";

const depositEvmSchema = z.object({
    chain_name: supportedEvmChainIdsSchema,
    amount: z.string(),
});
const depositSolanaSchema = z.object({
    chain_name: z.literal("solana"),
    amount: z.string(),
});

const depositTemplate = (allowedChains: string[]) => `
{{recentMessages}}

Given the recent messages.

Extract the following information about the requested Orderly Network deposit:
- Chain name from supported chain IDs: ${allowedChains.join(", ")}
- USDC amount to deposit

Respond with a JSON markdown block containing only the extracted values.

Example response:
\`\`\`json
{
    "chain_name": "base",
    "amount": "1.5"
}
\`\`\``;

async function depositUSDC(
    runtime: IAgentRuntime,
    evmChain: SupportedEvmChain,
    amount: string
): Promise<string> {
    const usdcAmount = new BigNumber(amount)
        .multipliedBy(new BigNumber(10).pow(6))
        .toFixed(0);

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

    return match(chainMode)
        .with("evm", async () => {
            const walletProvider = await initWalletProvider(runtime);
            const address = walletProvider.getAddress();
            const account = privateKeyToAccount(
                runtime.getSetting("EVM_PRIVATE_KEY") as `0x${string}`
            );

            const publicClient = createPublicClient({
                chain: walletProvider.getCurrentChain(),
                transport: http(),
            });
            const walletClient = walletProvider.getWalletClient(evmChain);

            const depositInput = {
                brokerHash: solidityPackedKeccak256(
                    ["string"],
                    [brokerId]
                ) as Address,
                tokenAmount: BigInt(usdcAmount),
                tokenHash: solidityPackedKeccak256(
                    ["string"],
                    ["USDC"]
                ) as Address,
                accountId: (await getAccountId(runtime)) as Address,
            };

            // check usdc allowance
            const usdcAllowance = await publicClient.readContract({
                address: getEvmUSDCAddress(evmChain),
                abi: erc20Abi,
                functionName: "allowance",
                args: [address, getEvmVaultAddress(evmChain)],
            });
            elizaLogger.info("USDC allowance:", usdcAllowance);

            if (usdcAllowance < BigInt(usdcAmount)) {
                elizaLogger.info("Approving USDC...");
                elizaLogger.info(
                    "getVaultAddress(chainName):",
                    getEvmVaultAddress(evmChain)
                );
                elizaLogger.info("usdcAmount:", usdcAmount);
                const hash = await walletClient.sendTransaction({
                    account,
                    to: getEvmUSDCAddress(evmChain),
                    data: encodeFunctionData({
                        abi: erc20Abi,
                        functionName: "approve",
                        args: [
                            getEvmVaultAddress(evmChain),
                            BigInt(usdcAmount),
                        ],
                    }),
                    chain: walletProvider.getCurrentChain(),
                    kzg: undefined,
                });
                elizaLogger.info("Approved USDC", hash);
            }

            const depositFee = await publicClient.readContract({
                address: getEvmVaultAddress(evmChain),
                abi: vaultAbi,
                functionName: "getDepositFee",
                args: [address, depositInput],
            });

            const tx = await walletClient.writeContract({
                account,
                address: getEvmVaultAddress(evmChain),
                abi: vaultAbi,
                functionName: "deposit",
                args: [depositInput],
                value: depositFee,
                chain: walletProvider.getCurrentChain(),
                kzg: undefined,
            });
            return tx;
        })
        .with("solana", async () => {
            const vaultAddress = getSolanaVaultAddress(network).toBase58();

            // Initialize Solana connection based on network
            const connection = new Connection(
                match(network)
                    .with("mainnet", () => clusterApiUrl("mainnet-beta"))
                    .with("testnet", () => clusterApiUrl("devnet"))
                    .exhaustive()
            );

            // Get the private key from settings and create keypair
            const privateKeyString = runtime.getSetting("SOLANA_PRIVATE_KEY");
            if (!privateKeyString) {
                throw new Error("SOLANA_PRIVATE_KEY is not set");
            }
            const privateKeyBytes = bs58.decode(privateKeyString);
            const senderKeypair = Keypair.fromSecretKey(privateKeyBytes);

            const address = senderKeypair.publicKey.toBase58();
            const depositInput = {
                brokerHash: solidityPackedKeccak256(
                    ["string"],
                    [brokerId]
                ) as Address,
                tokenAmount: BigInt(usdcAmount),
                tokenHash: solidityPackedKeccak256(
                    ["string"],
                    ["USDC"]
                ) as Address,
                accountId: (await getAccountId(runtime)) as Address,
                USDCAddress: getSolanaUSDCAddress(network).toBase58(),
            };

            const walletAdapter = new DefaultSolanaWalletAdapter();
            walletAdapter.active({
                address,
                provider: {
                    connection,
                    signMessage: () => Promise.resolve(new Uint8Array()),
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

            const depositFee: bigint = await walletAdapter.callOnChain(
                match(network)
                    .with("mainnet", () => solanaChainInfo)
                    .with("testnet", () => solanaDevnetChainInfo)
                    .exhaustive(),
                vaultAddress,
                "getDepositFee",
                [address, depositInput],
                {
                    abi: vaultAbi,
                }
            );
            const tx = await walletAdapter.sendTransaction(
                vaultAddress,
                "deposit",
                {
                    from: address,
                    to: vaultAddress,
                    data: [depositInput],
                    value: depositFee,
                },
                {
                    abi: vaultAbi,
                }
            );
            return tx;
        })
        .exhaustive();
}

export const deposit: Action = {
    name: "DEPOSIT_USDC",
    similes: [],
    validate: async (_runtime: IAgentRuntime, _message: Memory) => {
        return true;
    },
    description: "Deposit USDC into Orderly Network",
    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        state: State,
        _options: { [key: string]: unknown },
        callback?: HandlerCallback
    ): Promise<boolean> => {
        // Initialize or update state
        if (!state) {
            state = (await runtime.composeState(message)) as State;
        } else {
            state = await runtime.updateRecentMessageState(state);
        }
        const chainMode = runtime.getSetting("ORDERLY_CHAIN_MODE") as
            | "solana"
            | "evm";

        // Compose deposit context
        const allowedChains = match(chainMode)
            .with("evm", () => getAllowedEvmChains(runtime))
            .with("solana", () => ["solana"])
            .exhaustive();

        const depositContext = composeContext({
            state,
            template: depositTemplate(allowedChains),
        });

        // Generate deposit content
        const depositSchema = match(chainMode)
            .with("evm", () => depositEvmSchema)
            .with("solana", () => depositSolanaSchema)
            .exhaustive();
        const content = await generateObject({
            runtime,
            context: depositContext,
            modelClass: ModelClass.SMALL,
            schema: depositSchema,
        });

        // Validate deposit content
        const depositContent = depositSchema.safeParse(content.object);
        elizaLogger.info("Deposit content:", depositContent);
        if (!depositContent.success) {
            elizaLogger.error("Invalid content for DEPOSIT_USDC action.");
            if (callback) {
                callback({
                    text: "Unable to process deposit request. Invalid content provided.",
                    content: { error: "Invalid deposit content" },
                });
            }
            return false;
        }

        try {
            let { chain_name: chainName, amount } = depositContent.data;
            const txHash = await depositUSDC(
                runtime,
                chainName as SupportedEvmChain,
                amount.toString()
            );

            if (callback) {
                callback({
                    text: `Successfully deposited ${amount} USDC from ${chainName} into Orderly Network\nTransaction: ${txHash}`,
                    content: {
                        success: true,
                        signature: txHash,
                        amount: amount,
                        chainName: chainName,
                    },
                });
            }

            return true;
        } catch (error) {
            elizaLogger.error("Error during USDC deposit:", error);
            if (callback) {
                callback({
                    text: `Error depositing USDC: ${error}`,
                    content: { error: error },
                });
            }
            return false;
        }
    },

    examples: [
        [
            {
                user: "{{user1}}",
                content: {
                    text: "Deposit 1.5 USDC to Orderly Network",
                },
            },
            {
                user: "{{user2}}",
                content: {
                    text: "I'll deposit 1.5 USDC now...",
                    action: "DEPOSIT_USDC",
                },
            },
            {
                user: "{{user2}}",
                content: {
                    text: "Successfully deposited 1.5 USDC to Orderly Network\nTransaction: ABC123XYZ",
                },
            },
        ],
    ] as ActionExample[][],
} as Action;
