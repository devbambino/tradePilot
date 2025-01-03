import { z } from "zod";
import {
    ActionExample,
    composeContext,
    generateObject,
    HandlerCallback,
    IAgentRuntime,
    Memory,
    ModelClass,
    settings,
    State,
    type Action,
} from "@elizaos/core";
import { Connection, PublicKey, VersionedTransaction } from "@solana/web3.js";
import BigNumber from "bignumber.js";
import { getWalletKey } from "../keypairUtils.ts";
import { walletProvider, WalletProvider } from "../providers/wallet.ts";
import { getTokenDecimals } from "./swapUtils.ts";

export interface SwapContent {
    inputTokenSymbol?: string;
    outputTokenSymbol?: string;
    inputTokenCA: string;
    outputTokenCA: string;
    amount: number | string;
}

export const SwapContentSchema = z.object({
    inputTokenSymbol: z.string().optional(),
    outputTokenSymbol: z.string().optional(),
    inputTokenCA: z.string().optional(),
    outputTokenCA: z.string().optional(),
    amount: z.union([z.string(), z.number()]),
});

export const isSwapContent = (obj: any): obj is SwapContent => {
    return SwapContentSchema.safeParse(obj).success;
};

async function swapToken(
    connection: Connection,
    walletPublicKey: PublicKey,
    inputTokenCA: string,
    outputTokenCA: string,
    amount: number
): Promise<any> {
    try {
        // Get the decimals for the input token
        const decimals =
            inputTokenCA === settings.SOL_ADDRESS
                ? new BigNumber(9)
                : new BigNumber(
                      await getTokenDecimals(connection, inputTokenCA)
                  );

        console.log("Decimals:", decimals.toString());

        // Use BigNumber for adjustedAmount: amount * (10 ** decimals)
        const amountBN = new BigNumber(amount);
        const adjustedAmount = amountBN.multipliedBy(
            new BigNumber(10).pow(decimals)
        );

        console.log("Fetching quote with params:", {
            inputMint: inputTokenCA,
            outputMint: outputTokenCA,
            amount: adjustedAmount,
        });

        const quoteResponse = await fetch(
            `https://quote-api.jup.ag/v6/quote?inputMint=${inputTokenCA}&outputMint=${outputTokenCA}&amount=${adjustedAmount}&slippageBps=50`
        );
        const quoteData = await quoteResponse.json();

        if (!quoteData || quoteData.error) {
            console.error("Quote error:", quoteData);
            throw new Error(
                `Failed to get quote: ${quoteData?.error || "Unknown error"}`
            );
        }

        console.log("Quote received:", quoteData);

        const swapRequestBody = {
            quoteResponse: quoteData,
            userPublicKey: walletPublicKey.toString(),
            wrapAndUnwrapSol: true,
            computeUnitPriceMicroLamports: 2000000,
            dynamicComputeUnitLimit: true,
        };

        console.log("Requesting swap with body:", swapRequestBody);

        const swapResponse = await fetch("https://quote-api.jup.ag/v6/swap", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(swapRequestBody),
        });

        const swapData = await swapResponse.json();

        if (!swapData || !swapData.swapTransaction) {
            console.error("Swap error:", swapData);
            throw new Error(
                `Failed to get swap transaction: ${swapData?.error || "No swap transaction returned"}`
            );
        }

        console.log("Swap transaction received");
        return swapData;
    } catch (error) {
        console.error("Error in swapToken:", error);
        throw error;
    }
}

const swapTemplate = `Respond with a JSON markdown block containing only the extracted values. Use null for any values that cannot be determined.

Example response:
\`\`\`json
{
    "inputTokenSymbol": "SOL",
    "outputTokenSymbol": "USDC",
    "inputTokenCA": "So11111111111111111111111111111111111111112",
    "outputTokenCA": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
    "amount": 1.5
}
\`\`\`

{{recentMessages}}

Given the recent messages and wallet information below:

{{walletInfo}}

Extract the following information about the requested token swap:
- Input token symbol (the token being sold)
- Output token symbol (the token being bought)
- Input token contract address if provided
- Output token contract address if provided
- Amount to swap

Respond with a JSON markdown block containing only the extracted values. Use null for any values that cannot be determined. The result should be a valid JSON object with the following schema:
\`\`\`json
{
    "inputTokenSymbol": string | null,
    "outputTokenSymbol": string | null,
    "inputTokenCA": string | null,
    "outputTokenCA": string | null,
    "amount": number | string | null
}
\`\`\``;

// if we get the token symbol but not the CA, check walet for matching token, and if we have, get the CA for it

// get all the tokens in the wallet using the wallet provider
async function getTokensInWallet(runtime: IAgentRuntime) {
    const { publicKey } = await getWalletKey(runtime, false);
    const walletProvider = new WalletProvider(
        new Connection("https://api.mainnet-beta.solana.com"),
        publicKey
    );

    const walletInfo = await walletProvider.fetchPortfolioValue(runtime);
    const items = walletInfo.items;
    return items;
}

// check if the token symbol is in the wallet
async function getTokenFromWallet(runtime: IAgentRuntime, tokenSymbol: string) {
    try {
        const items = await getTokensInWallet(runtime);
        const token = items.find((item) => item.symbol === tokenSymbol);

        if (token) {
            return token.address;
        } else {
            return null;
        }
    } catch (error) {
        console.error("Error checking token in wallet:", error);
        return null;
    }
}

// swapToken should took CA, not symbol

export const executeSwap: Action = {
    name: "EXECUTE_SWAP",
    similes: ["SWAP_TOKENS", "TOKEN_SWAP", "TRADE_TOKENS", "EXCHANGE_TOKENS"],
    validate: async (runtime: IAgentRuntime, message: Memory) => {
        // Check if the necessary parameters are provided in the message
        console.log("Message:", message);
        return true;
    },
    description: "Perform a token swap.",
    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        state: State,
        _options: { [key: string]: unknown },
        callback?: HandlerCallback
    ): Promise<boolean> => {
        // composeState
        if (!state) {
            state = (await runtime.composeState(message)) as State;
        } else {
            state = await runtime.updateRecentMessageState(state);
        }

        const walletInfo = await walletProvider.get(runtime, message, state);

        state.walletInfo = walletInfo;

        const swapContext = composeContext({
            state,
            template: swapTemplate,
        });

        const content = await generateObject({
            runtime,
            context: swapContext,
            modelClass: ModelClass.LARGE,
            schema: SwapContentSchema,
        });

        if (!isSwapContent(content.object)) {
            console.error("Invalid content for EXECUTE_SWAP action.");
            if (callback) {
                callback({
                    text: "Unable to process swap request. Invalid content provided.",
                    content: { error: "Invalid swap content" },
                });
            }
            return false;
        }

        const { inputTokenSymbol, outputTokenSymbol, amount } =
            content.object as SwapContent;
        let { inputTokenCA, outputTokenCA } = content.object as SwapContent;
        // Add SOL handling logic
        if (inputTokenSymbol?.toUpperCase() === "SOL") {
            inputTokenCA = settings.SOL_ADDRESS;
        }
        if (outputTokenSymbol?.toUpperCase() === "SOL") {
            outputTokenCA = settings.SOL_ADDRESS;
        }

        // if both contract addresses are set, lets execute the swap
        // TODO: try to resolve CA from symbol based on existing symbol in wallet
        if (!inputTokenCA && inputTokenSymbol) {
            console.log(
                `Attempting to resolve CA for input token symbol: ${inputTokenSymbol}`
            );
            inputTokenCA = await getTokenFromWallet(runtime, inputTokenSymbol);
            if (inputTokenCA) {
                console.log(`Resolved inputTokenCA: ${inputTokenCA}`);
            } else {
                console.log("No contract addresses provided, skipping swap");
                const responseMsg = {
                    text: "I need the contract addresses to perform the swap",
                };
                callback?.(responseMsg);
                return true;
            }
        }

        if (!outputTokenCA && outputTokenSymbol) {
            console.log(
                `Attempting to resolve CA for output token symbol: ${outputTokenSymbol}`
            );
            outputTokenCA = await getTokenFromWallet(
                runtime,
                outputTokenSymbol
            );
            if (outputTokenCA) {
                console.log(`Resolved outputTokenCA: ${outputTokenCA}`);
            } else {
                console.log("No contract addresses provided, skipping swap");
                const responseMsg = {
                    text: "I need the contract addresses to perform the swap",
                };
                callback?.(responseMsg);
                return true;
            }
        }

        if (!amount) {
            console.log("No amount provided, skipping swap");
            const responseMsg = {
                text: "I need the amount to perform the swap",
            };
            callback?.(responseMsg);
            return true;
        }

        // TODO: if response amount is half, all, etc, semantically retrieve amount and return as number
        if (!amount) {
            console.log("Amount is not a number, skipping swap");
            const responseMsg = {
                text: "The amount must be a number",
            };
            callback?.(responseMsg);
            return true;
        }
        try {
            const connection = new Connection(
                "https://api.mainnet-beta.solana.com"
            );
            const { publicKey: walletPublicKey } = await getWalletKey(
                runtime,
                false
            );

            // const provider = new WalletProvider(connection, walletPublicKey);

            console.log("Wallet Public Key:", walletPublicKey);
            console.log("inputTokenSymbol:", inputTokenCA);
            console.log("outputTokenSymbol:", outputTokenCA);
            console.log("amount:", amount);

            const swapResult = await swapToken(
                connection,
                walletPublicKey,
                inputTokenCA as string,
                outputTokenCA as string,
                amount as number
            );

            console.log("Deserializing transaction...");
            const transactionBuf = Buffer.from(
                swapResult.swapTransaction,
                "base64"
            );
            const transaction =
                VersionedTransaction.deserialize(transactionBuf);

            console.log("Preparing to sign transaction...");

            console.log("Creating keypair...");
            const { keypair } = await getWalletKey(runtime, true);
            // Verify the public key matches what we expect
            if (keypair.publicKey.toBase58() !== walletPublicKey.toBase58()) {
                throw new Error(
                    "Generated public key doesn't match expected public key"
                );
            }

            console.log("Signing transaction...");
            transaction.sign([keypair]);

            console.log("Sending transaction...");

            const latestBlockhash = await connection.getLatestBlockhash();

            const txid = await connection.sendTransaction(transaction, {
                skipPreflight: false,
                maxRetries: 3,
                preflightCommitment: "confirmed",
            });

            console.log("Transaction sent:", txid);

            // Confirm transaction using the blockhash
            const confirmation = await connection.confirmTransaction(
                {
                    signature: txid,
                    blockhash: latestBlockhash.blockhash,
                    lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
                },
                "confirmed"
            );

            if (confirmation.value.err) {
                throw new Error(
                    `Transaction failed: ${confirmation.value.err}`
                );
            }

            if (confirmation.value.err) {
                throw new Error(
                    `Transaction failed: ${confirmation.value.err}`
                );
            }

            console.log("Swap completed successfully!");
            console.log(`Transaction ID: ${txid}`);

            const responseMsg = {
                text: `Swap completed successfully! Transaction ID: ${txid}`,
            };

            callback?.(responseMsg);

            return true;
        } catch (error) {
            console.error("Error during token swap:", error);
            return false;
        }
    },
    examples: [
        [
            {
                user: "{{user1}}",
                content: {
                    inputTokenSymbol: "SOL",
                    outputTokenSymbol: "USDC",
                    amount: 0.1,
                },
            },
            {
                user: "{{user2}}",
                content: {
                    text: "Swapping 0.1 SOL for USDC...",
                    action: "TOKEN_SWAP",
                },
            },
            {
                user: "{{user2}}",
                content: {
                    text: "Swap completed successfully! Transaction ID: ...",
                },
            },
        ],
        // Add more examples as needed
    ] as ActionExample[][],
} as Action;
