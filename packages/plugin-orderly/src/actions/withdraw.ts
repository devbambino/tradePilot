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
    getAccountId,
    getOrderlyKey,
    getPositions,
    settlePnlFromOrderly,
    withdrawUSDCFromOrderly,
} from "../helpers";
import {
    getAllowedEvmChains,
    SupportedEvmChain,
    supportedEvmChainIdsSchema,
} from "../network";
import { z } from "zod";
import BigNumber from "bignumber.js";
import { Address } from "viem";
import { match } from "ts-pattern";

const withdrawEvmSchema = z.object({
    chain_name: supportedEvmChainIdsSchema,
    amount: z.string(),
});
const withdrawSolanaSchema = z.object({
    chain_name: z.literal("solana"),
    amount: z.string(),
});

const withdrawTemplate = (allowedChains: string[]) => `
{{recentMessages}}

Given the recent messages.

Extract the following information about the requested Orderly Network withdraw:
- Chain name from supported chain IDs: ${allowedChains.join(", ")}
- USDC amount to withdraw

Respond with a JSON markdown block containing only the extracted values.

Example response:
\`\`\`json
{
    "chain_name": "base",
    "amount": "1.5"
}
\`\`\``;

async function withdrawUSDC(
    runtime: IAgentRuntime,
    chainName: SupportedEvmChain,
    amount: string
): Promise<void> {
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

    const accountId = (await getAccountId(runtime)) as Address;
    const orderlyKey = await getOrderlyKey(runtime);

    const positions = await getPositions(network, accountId, orderlyKey);
    const unsettledPnl = positions.rows.reduce((acc, position) => {
        return acc + position.unsettled_pnl;
    }, 0);

    if (unsettledPnl !== 0) {
        await settlePnlFromOrderly(
            runtime,
            chainName,
            brokerId,
            accountId,
            orderlyKey
        );
    }

    await withdrawUSDCFromOrderly(
        runtime,
        chainName,
        brokerId,
        accountId,
        orderlyKey,
        usdcAmount
    );
}

export const withdraw: Action = {
    name: "WITHDRAW_USDC",
    similes: [],
    validate: async (_runtime: IAgentRuntime, _message: Memory) => {
        return true;
    },
    description: "Withdraw USDC from Orderly Network",
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

        // Compose withdraw context
        const allowedChains = match(chainMode)
            .with("evm", () => getAllowedEvmChains(runtime))
            .with("solana", () => ["solana"])
            .exhaustive();
        const withdrawContext = composeContext({
            state,
            template: withdrawTemplate(allowedChains),
        });

        // Generate withdraw content
        const withdrawSchema = match(chainMode)
            .with("evm", () => withdrawEvmSchema)
            .with("solana", () => withdrawSolanaSchema)
            .exhaustive();
        const content = await generateObject({
            runtime,
            context: withdrawContext,
            modelClass: ModelClass.SMALL,
            schema: withdrawSchema,
        });

        // Validate withdraw content
        elizaLogger.info("Withdraw content:", content.object);
        const withdrawContent = withdrawSchema.safeParse(content.object);
        if (!withdrawContent.success) {
            elizaLogger.error("Invalid content for WITHDRAW_USDC action.");
            if (callback) {
                callback({
                    text: "Unable to process withdraw request. Invalid content provided.",
                    content: { error: "Invalid withdraw content" },
                });
            }
            return false;
        }

        try {
            const { chain_name: chainName, amount } = withdrawContent.data;
            await withdrawUSDC(
                runtime,
                chainName as SupportedEvmChain,
                amount.toString()
            );

            if (callback) {
                callback({
                    text: `Successfully withdrew ${amount} USDC from ${chainName} into Orderly Network`,
                    content: {
                        success: true,
                        amount: amount,
                        chainName: chainName,
                    },
                });
            }

            return true;
        } catch (error) {
            elizaLogger.error("Error during USDC withdraw:", error);
            if (callback) {
                callback({
                    text: `Error withdrawing USDC: ${error}`,
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
                    text: "Withdraw 1.5 USDC from Orderly Network",
                },
            },
            {
                user: "{{user2}}",
                content: {
                    text: "I'll withdraw 1.5 USDC now...",
                    action: "WITHDRAW_USDC",
                },
            },
            {
                user: "{{user2}}",
                content: {
                    text: "Successfully withdrew 1.5 USDC from Orderly Network",
                },
            },
        ],
    ] as ActionExample[][],
} as Action;
