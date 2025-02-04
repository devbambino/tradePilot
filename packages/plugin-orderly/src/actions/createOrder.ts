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
} from "../helpers";
import { getAllowedEvmChains, supportedEvmChainIdsSchema } from "../network";
import { z } from "zod";
import { OrderEntity, OrderSide } from "@orderly.network/types";
import { OrderType } from "@orderly.network/types";
import { match } from "ts-pattern";

const createOrderEvmSchema = z.object({
    chain_name: supportedEvmChainIdsSchema,
    symbol: z.string(),
    order_type: z.nativeEnum(OrderType),
    order_price: z
        .string()
        .transform((value) => value || undefined)
        .optional(),
    order_quantity: z
        .string()
        .transform((value) => value || undefined)
        .optional(),
    side: z.nativeEnum(OrderSide),
});
const createOrderSolanaSchema = z.object({
    chain_name: z.literal("solana"),
    symbol: z.string(),
    order_type: z.nativeEnum(OrderType),
    order_price: z
        .string()
        .transform((value) => value || undefined)
        .optional(),
    order_quantity: z
        .string()
        .transform((value) => value || undefined)
        .optional(),
    side: z.nativeEnum(OrderSide),
});

const createOrderTemplate = (
    allowedChains: string[],
    allowedSymbols: string[]
) => `
{{recentMessages}}

Given the recent messages.

Extract the following information about the requested Orderly Network order creation:
- Chain name from supported chain IDs: ${allowedChains.join(", ")}
- Symbol to buy out of these given symbols: ${allowedSymbols.join(", ")}
- Order type from supported order types: ${Object.values(OrderType).join(", ")}
- Order price
- Order quantity
- Order side from supported order sides: ${Object.values(OrderSide).join(", ")}

Respond with a JSON markdown block containing only the extracted values.

Example response:
\`\`\`json
{
    "chain_name": "base",
    "symbol": "PERP_ETH_USDC",
    "order_type": "MARKET",
    "order_price": "1000",
    "order_quantity": "1",
    "side": "BUY"
}
\`\`\``;

async function createOrderAction(
    runtime: IAgentRuntime,
    order: OrderEntity
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
    if (order.order_type === OrderType.MARKET) {
        order.order_price = undefined;
    }
    await createOrderAtOrderly(network, accountId, orderlyKey, order);
}

export const createOrder: Action = {
    name: "CREATE_ORDER",
    similes: [],
    validate: async (_runtime: IAgentRuntime, _message: Memory) => {
        return true;
    },
    description: "Create an order at Orderly Network",
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

        // Compose create order context
        const allowedChains = match(chainMode)
            .with("evm", () => getAllowedEvmChains(runtime))
            .with("solana", () => ["solana"])
            .exhaustive();
        const allowedSymbols = await getAllowedSymbols(
            runtime.getSetting("ORDERLY_NETWORK") as "mainnet" | "testnet"
        );
        const transferContext = composeContext({
            state,
            template: createOrderTemplate(allowedChains, allowedSymbols),
        });

        // Generate create order content
        const createOrderSchema = match(chainMode)
            .with("evm", () => createOrderEvmSchema)
            .with("solana", () => createOrderSolanaSchema)
            .exhaustive();
        const content = await generateObject({
            runtime,
            context: transferContext,
            modelClass: ModelClass.SMALL,
            schema: createOrderSchema,
        });

        // Validate create order content
        elizaLogger.info("Create order content:", content.object);
        const createOrderContent = createOrderSchema.safeParse(content.object);
        if (!createOrderContent.success) {
            elizaLogger.error("Invalid content for CREATE_ORDER action.");
            if (callback) {
                callback({
                    text: "Unable to process create order request. Invalid content provided.",
                    content: { error: "Invalid create order content" },
                });
            }
            return false;
        }

        try {
            const { chain_name: chainName, ...order } = createOrderContent.data;
            await createOrderAction(runtime, order as OrderEntity);

            if (callback) {
                callback({
                    text: `Successfully created order ${JSON.stringify(
                        order
                    )} on ${chainName}`,
                    content: {
                        success: true,
                        chainName: chainName,
                        order: order,
                    },
                });
            }

            return true;
        } catch (error) {
            elizaLogger.error("Error during order creation:", error);
            if (callback) {
                callback({
                    text: `Error creating order: ${error}`,
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
                    text: "Create a market order to buy 1 ETH at $1000",
                },
            },
            {
                user: "{{user2}}",
                content: {
                    text: "Create a market order to buy 1 ETH at $1000",
                    action: "CREATE_ORDER",
                },
            },
            {
                user: "{{user2}}",
                content: {
                    text: "Successfully created order to buy 1 ETH at $1000",
                },
            },
        ],
    ] as ActionExample[][],
} as Action;
