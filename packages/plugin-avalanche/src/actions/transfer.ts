import {
    Action,
    ActionExample,
    IAgentRuntime,
    Memory,
    State,
    HandlerCallback,
    elizaLogger,
    composeContext,
    generateObject,
    ModelClass,
} from "@elizaos/core";
import { getTxReceipt, sendNativeAsset, sendToken } from "../utils";
import { Address } from "viem";
import { validateAvalancheConfig } from "../environment";
import { TOKEN_ADDRESSES } from "../utils/constants";
import { isTransferContent, TransferSchema, TransferContent } from "../types";

const transferTemplate = `Respond with a JSON markdown block containing only the extracted values
- Use null for any values that cannot be determined.
- Use address zero for native AVAX transfers.

Example response for a 10 WAVAX transfer:
\`\`\`json
{
    "tokenAddress": "0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7",
    "recipient": "0xDcEDF06Fd33E1D7b6eb4b309f779a0e9D3172e44",
    "amount": "10"
}
\`\`\`

Example response for a 0.1 AVAX transfer:
\`\`\`json
{
    "tokenAddress": "0x0000000000000000000000000000000000000000",
    "recipient": "0xDcEDF06Fd33E1D7b6eb4b309f779a0e9D3172e44",
    "amount": "0.1"
}
\`\`\`

## Token Addresses

${Object.entries(TOKEN_ADDRESSES)
    .map(([key, value]) => `- ${key}: ${value}`)
    .join("\n")}

## Recent Messages

{{recentMessages}}

Given the recent messages, extract the following information about the requested token transfer:
- Token contract address
- Recipient wallet address
- Amount to transfer

Respond with a JSON markdown block containing only the extracted values.`;

export default {
    name: "SEND_TOKEN",
    similes: [
        "TRANSFER_TOKEN_ON_AVALANCHE",
        "TRANSFER_TOKENS_ON_AVALANCHE",
        "SEND_TOKENS_ON_AVALANCHE",
        "SEND_AVAX_ON_AVALANCHE",
        "PAY_ON_AVALANCHE",
    ],
    validate: async (runtime: IAgentRuntime, _message: Memory) => {
        await validateAvalancheConfig(runtime);
        return true;
    },
    description:
        "MUST use this action if the user requests send a token or transfer a token, the request might be varied, but it will always be a token transfer.",
    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        state: State,
        _options: { [key: string]: unknown },
        callback?: HandlerCallback
    ) => {
        elizaLogger.log("Starting SEND_TOKEN handler...");

        // Validate transfer
        if (message.content.source === "direct") {
            //
        } else {
            callback?.({
                text: "i can't do that for you.",
                content: { error: "Transfer not allowed" },
            });
            return false;
        }

        // Initialize or update state
        if (!state) {
            state = (await runtime.composeState(message)) as State;
        } else {
            state = await runtime.updateRecentMessageState(state);
        }

        // Compose transfer context
        const transferContext = composeContext({
            state,
            template: transferTemplate,
        });

        // Generate transfer content
        const content = await generateObject({
            runtime,
            context: transferContext,
            modelClass: ModelClass.SMALL,
            schema: TransferSchema,
        });

        elizaLogger.debug("Transfer content:", content);

        // Validate transfer content
        if (!isTransferContent(content.object)) {
            elizaLogger.error("Invalid content for TRANSFER_TOKEN action.");
            callback?.({
                text: "Unable to process transfer request. Invalid content provided.",
                content: { error: "Invalid transfer content" },
            });
            return false;
        }

        const { tokenAddress, recipient, amount } =
            content.object as TransferContent;
        let tx;
        if (tokenAddress === "0x0000000000000000000000000000000000000000") {
            tx = await sendNativeAsset(
                runtime,
                recipient as Address,
                amount as number
            );
        } else {
            tx = await sendToken(
                runtime,
                tokenAddress as Address,
                recipient as Address,
                amount as number
            );
        }

        if (tx) {
            const receipt = await getTxReceipt(runtime, tx);
            if (receipt.status === "success") {
                callback?.({
                    text: "transfer successful",
                    content: { success: true, txHash: tx },
                });
            } else {
                callback?.({
                    text: "transfer failed",
                    content: { error: "Transfer failed" },
                });
            }
        } else {
            callback?.({
                text: "transfer failed",
                content: { error: "Transfer failed" },
            });
        }

        return true;
    },
    examples: [
        [
            {
                user: "{{user1}}",
                content: {
                    text: "Send 10 AVAX to 0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7",
                },
            },
        ],
    ] as ActionExample[][],
} as Action;
