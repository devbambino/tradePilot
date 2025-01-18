import {
    ActionExample,
    Content,
    HandlerCallback,
    IAgentRuntime,
    Memory,
    ModelClass,
    State,
    composeContext,
    elizaLogger,
    generateObject,
    type Action,
} from "@elizaos/core";
import { z } from "zod";

import { SuiClient, getFullnodeUrl } from "@mysten/sui/client";
import { SUI_DECIMALS } from "@mysten/sui/utils";
import { Aftermath } from "aftermath-ts-sdk";

import { walletProvider } from "../providers/wallet";
import { parseAccount } from "../utils";
import { SuiNetwork } from "../types";

export interface SwapContent extends Content {
    recipient: string;
    amount: string | number;
    fromCoinType: string;
    toCoinType: string;
}

function isSwapContent(content: Content): content is SwapContent {
    console.log("Content for swap", content);
    return (
        typeof content.recipient === "string" &&
        typeof content.fromCoinType === "string" &&
        typeof content.toCoinType === "string" &&
        (typeof content.amount === "string" ||
            typeof content.amount === "number")
    );
}

const swapTemplate = `Respond with a JSON markdown block containing only the extracted values. Use null for any values that cannot be determined.

Example response:
\`\`\`json
{
    "recipient": "0xaa000b3651bd1e57554ebd7308ca70df7c8c0e8e09d67123cc15c8a8a79342b3",
    "amount": "1",
    "fromCoinType": "0x2::sui::SUI",
    "toCoinType": "0xdeeb7a4662eec9f2f3def03fb937a663dddaa2e215b8078a284d026b7946c270::deep::DEEP"
}
\`\`\`

{{recentMessages}}

Given the recent messages, extract the following information about the requested token swap:
- Recipient wallet address to receive swapped tokens
- Amount of tokens to swap
- Source token type to swap from
- Destination token type to swap to

Respond with a JSON markdown block containing only the extracted values.`;

export default {
    name: "SWAP_TOKEN",
    similes: ["SWAP_TOKEN", "SWAP_TOKENS", "SWAP_SUI", "SWAP"],
    validate: async (runtime: IAgentRuntime, message: Memory) => {
        console.log("Validating sui swap from user:", message.userId);
        //add custom validate logic here
        /*
            const adminIds = runtime.getSetting("ADMIN_USER_IDS")?.split(",") || [];
            //console.log("Admin IDs from settings:", adminIds);

            const isAdmin = adminIds.includes(message.userId);

            if (isAdmin) {
                //console.log(`Authorized transfer from user: ${message.userId}`);
                return true;
            }
            else
            {
                //console.log(`Unauthorized transfer attempt from user: ${message.userId}`);
                return false;
            }
            */
        return true;
    },
    description: "Swap tokens from the agent's wallet to another address",
    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        state: State,
        _options: { [key: string]: unknown },
        callback?: HandlerCallback
    ): Promise<boolean> => {
        elizaLogger.log("Starting SWAP_TOKEN handler...");

        const walletInfo = await walletProvider.get(runtime, message, state);
        state.walletInfo = walletInfo;

        // Initialize or update state
        if (!state) {
            state = (await runtime.composeState(message)) as State;
        } else {
            state = await runtime.updateRecentMessageState(state);
        }

        // Define the schema for the expected output
        const swapSchema = z.object({
            recipient: z.string(),
            amount: z.union([z.string(), z.number()]),
            fromCoinType: z.string(),
            toCoinType: z.string(),
        });

        // Compose swap context
        const swapContext = composeContext({
            state,
            template: swapTemplate,
        });

        // Generate swap content with the schema
        const content = await generateObject({
            runtime,
            context: swapContext,
            schema: swapSchema,
            modelClass: ModelClass.SMALL,
        });

        const swapContent = content.object as SwapContent;

        // Validate swap content
        if (!isSwapContent(swapContent)) {
            console.error("Invalid content for SWAP_TOKEN action.");
            if (callback) {
                callback({
                    text: "Unable to process swap request. Invalid content provided.",
                    content: { error: "Invalid swap content" },
                });
            }
            return false;
        }

        try {
            const suiAccount = parseAccount(runtime);
            const network = runtime.getSetting("SUI_NETWORK");
            const suiClient = new SuiClient({
                url: getFullnodeUrl(network as SuiNetwork),
            });
            const router = new Aftermath("MAINNET").Router();
            const adjustedAmount = BigInt(
                Number(swapContent.amount) * Math.pow(10, SUI_DECIMALS)
            );
            console.log(
                `Swapping: ${swapContent.amount} ${swapContent.fromCoinType} to ${swapContent.toCoinType} (${adjustedAmount} base units)`
            );
            const route = await router.getCompleteTradeRouteGivenAmountIn({
                coinInType: swapContent.fromCoinType,
                coinOutType: swapContent.toCoinType,
                coinInAmount: adjustedAmount,
            });
            console.log("Route:", route);
            const tx = await router.getTransactionForCompleteTradeRoute({
                walletAddress: swapContent.recipient,
                completeRoute: route,
                slippage: 0.01, // 1% max slippage
            });
            console.log("Transaction:", tx);
            const executedTransaction =
                await suiClient.signAndExecuteTransaction({
                    signer: suiAccount,
                    transaction: tx,
                });

            console.log("Swap successful:", executedTransaction.digest);

            if (callback) {
                callback({
                    text: `Successfully swapped ${swapContent.amount} ${swapContent.fromCoinType} to ${swapContent.toCoinType} to ${swapContent.recipient}, Transaction: ${executedTransaction.digest}`,
                    content: {
                        success: true,
                        hash: executedTransaction.digest,
                        amount: swapContent.amount,
                        recipient: swapContent.recipient,
                    },
                });
            }

            return true;
        } catch (error) {
            console.error("Error during token swap:", error);
            if (callback) {
                callback({
                    text: `Error swapping tokens: ${error.message}`,
                    content: { error: error.message },
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
                    text: "Swap 1 SUI(0x2::sui::SUI) to DEEP(0xdeeb7a4662eec9f2f3def03fb937a663dddaa2e215b8078a284d026b7946c270::deep::DEEP) to 0x4f2e63be8e7fe287836e29cde6f3d5cbc96eefd0c0e3f3747668faa2ae7324b0",
                },
            },
            {
                user: "{{user2}}",
                content: {
                    text: "Swap 1 SUI(0x2::sui::SUI) to DEEP(0xdeeb7a4662eec9f2f3def03fb937a663dddaa2e215b8078a284d026b7946c270::deep::DEEP) to 0x4f2e63be8e7fe287836e29cde6f3d5cbc96eefd0c0e3f3747668faa2ae7324b0",
                    action: "SWAP_TOKEN",
                },
            },
            {
                user: "{{user2}}",
                content: {
                    text: "Successfully swapped 1 SUI to DEEP to 0x4f2e63be8e7fe287836e29cde6f3d5cbc96eefd0c0e3f3747668faa2ae7324b0, Transaction: 0x39a8c432d9bdad993a33cc1faf2e9b58fb7dd940c0425f1d6db3997e4b4b05c0",
                },
            },
        ],
    ] as ActionExample[][],
} as Action;
