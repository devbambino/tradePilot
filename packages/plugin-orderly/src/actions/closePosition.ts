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
import {
    createOrderAtOrderly,
    getAccountId,
    getAllowedSymbols,
    getOrderlyKey,
    getPosition,
} from "../helpers";
import { getAllowedEvmChains, supportedEvmChainIdsSchema } from "../network";
import { z } from "zod";
import { API, OrderSide } from "@orderly.network/types";
import { OrderType } from "@orderly.network/types";
import { match } from "ts-pattern";

const closePositionEvmSchema = z.object({
    chain_name: supportedEvmChainIdsSchema,
    symbol: z.string(),
});
const closePositionSolanaSchema = z.object({
    chain_name: z.literal("solana"),
    symbol: z.string(),
});

const closePositionTemplate = (
    allowedChains: string[],
    allowedSymbols: string[]
) => `
{{recentMessages}}

Given the recent messages.

Extract the following information about the requested Orderly Network position closing:
- Chain name from supported chain IDs: ${allowedChains.join(", ")}
- Symbol to buy out of these given symbols: ${allowedSymbols.join(", ")}

Respond with a JSON markdown block containing only the extracted values.

Example response:
\`\`\`json
{
    "chain_name": "base",
    "symbol": "PERP_ETH_USDC"
}
\`\`\``;

async function closePositionAction(
    runtime: IAgentRuntime,
    position: API.Position
): Promise<void> {
    const brokerId = runtime.getSetting("ORDERLY_BROKER_ID");
    if (!brokerId) {
        throw new Error("ORDERLY_BROKER_ID is not set");
    }

    const network = runtime.getSetting("ORDERLY_NETWORK") as
        | "mainnet"
        | "testnet";
    const accountId = await getAccountId(runtime);
    const orderlyKey = await getOrderlyKey(runtime);
    await createOrderAtOrderly(network, accountId, orderlyKey, {
        order_type: OrderType.MARKET,
        side: position.position_qty > 0 ? OrderSide.SELL : OrderSide.BUY,
        symbol: position.symbol,
        reduce_only: true,
        order_quantity: String(Math.abs(position.position_qty)),
    });
}

export const closePosition: Action = {
    name: "CLOSE_POSITION",
    similes: [],
    validate: async (_runtime: IAgentRuntime, _message: Memory) => {
        return true;
    },
    description: "Close a position at Orderly Network",
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

        // Compose close position context
        const allowedChains = match(chainMode)
            .with("evm", () => getAllowedEvmChains(runtime))
            .with("solana", () => ["solana"])
            .exhaustive();
        const allowedSymbols = await getAllowedSymbols(
            runtime.getSetting("ORDERLY_NETWORK") as "mainnet" | "testnet"
        );
        const transferContext = composeContext({
            state,
            template: closePositionTemplate(allowedChains, allowedSymbols),
        });

        // Generate close position content
        const closePositionSchema = match(chainMode)
            .with("evm", () => closePositionEvmSchema)
            .with("solana", () => closePositionSolanaSchema)
            .exhaustive();
        const content = await generateObject({
            runtime,
            context: transferContext,
            modelClass: ModelClass.SMALL,
            schema: closePositionSchema,
        });

        // Validate close position content
        elizaLogger.info("Close position content:", content.object);
        const closePositionContent = closePositionSchema.safeParse(
            content.object
        );
        if (!closePositionContent.success) {
            elizaLogger.error("Invalid content for CLOSE_POSITION action.");
            if (callback) {
                callback({
                    text: "Unable to process close position request. Invalid content provided.",
                    content: { error: "Invalid close position content" },
                });
            }
            return false;
        }

        try {
            const { chain_name: chainName, symbol } = closePositionContent.data;
            const orderlyKey = await getOrderlyKey(runtime);
            const brokerId = runtime.getSetting("ORDERLY_BROKER_ID");
            if (!brokerId) {
                throw new Error("ORDERLY_BROKER_ID is not set");
            }
            const network = runtime.getSetting("ORDERLY_NETWORK") as "mainnet";
            const accountId = await getAccountId(runtime);
            const position = await getPosition(
                network,
                accountId,
                orderlyKey,
                symbol
            );
            await closePositionAction(runtime, position);

            if (callback) {
                callback({
                    text: `Successfully closed position ${symbol} on ${chainName}`,
                    content: {
                        success: true,
                        chainName: chainName,
                        symbol: symbol,
                    },
                });
            }

            return true;
        } catch (error) {
            elizaLogger.error("Error during position closing:", error);
            if (callback) {
                callback({
                    text: `Error closing position: ${error}`,
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
                    text: "Close the position PERP_ETH_USDC on base",
                },
            },
            {
                user: "{{user2}}",
                content: {
                    text: "Close the position PERP_ETH_USDC on base",
                    action: "CLOSE_POSITION",
                },
            },
            {
                user: "{{user2}}",
                content: {
                    text: "Successfully closed position PERP_ETH_USDC on base",
                },
            },
        ],
    ] as ActionExample[][],
} as Action;
