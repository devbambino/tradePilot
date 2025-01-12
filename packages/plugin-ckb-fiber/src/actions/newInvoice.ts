import {
    Action,
    IAgentRuntime,
    Memory,
    HandlerCallback,
    State,
    composeContext,
    generateObject,
    ModelClass,
    elizaLogger,
} from "@elizaos/core";

import {CKBFiberService, ServiceTypeCKBFiber} from "../ckb/fiber/service.ts";
import { z } from "zod";
import {formatInvoice} from "../ckb/fiber/formatter.ts";

const schema = z.object({
    amount: z.number(),
    tokenType: z.string(),
});

type Content = {
    amount: number;
    tokenType: string;
}

const template = `Respond with a JSON markdown block containing only the extracted values. Use null for any values that cannot be determined.

Example response:
\`\`\`json
{
    "amount": 1,
    "tokenType": "CKB",
}
\`\`\`

{{recentMessages}}

Given the recent messages, extract the following information about the new invoice:
- Invoice amount (The amount to be received)
- Token type (e.g., "USDI", "CKB", default to "CKB")

Respond with a JSON markdown block containing only the extracted values.`

export const newInvoice: Action = {
    name: "NEW_INVOICE",
    similes: ["CREATE_INVOICE", "RECEIVE_FUND", "REQUEST_PAYMENT"],
    description: "Get the payment result",
    validate: async (runtime: IAgentRuntime, _message: Memory) => {
        if (!await runtime.getService<CKBFiberService>(ServiceTypeCKBFiber)?.checkNode())
            return false
        return true;
    },
    handler: async (
        runtime: IAgentRuntime,
        _message: Memory,
        state: State,
        _options: any,
        callback: HandlerCallback
    ) => {
        try {
            const service = runtime.getService<CKBFiberService>(ServiceTypeCKBFiber);

            // Initialize or update state
            if (!state) {
                state = await runtime.composeState(_message);
            } else {
                state = await runtime.updateRecentMessageState(state);
            }

            // Compose transfer context
            const context = composeContext({ state, template, });

            // Generate transfer content
            const content = (await generateObject({
                runtime, context, modelClass: ModelClass.SMALL, schema
            })).object as Content;

            content.tokenType = content.tokenType || "ckb";
            const udtType = content.tokenType.toLowerCase() === "ckb" ? undefined : content.tokenType.toLowerCase();

            const invoice = await service.newInvoice(content.amount, udtType);

            return callback({ text: formatInvoice(invoice) }, []);
        } catch (error) {
            elizaLogger.error("Error create invoice:", error);
            callback(
                { text: `Fail to create invoice, message: ${error.message}` },
                []
            );
        }
    },
    examples: [
        [
            {
                user: "{{user1}}",
                content: {
                    text: "Receive 177 CKB",
                },
            },
            {
                user: "{{agentName}}",
                content: {
                    text: "Okay, I'm creating an invoice to receive 177 CKB...",
                    action: "NEW_INVOICE"
                }
            }
        ],
        [
            {
                user: "{{user1}}",
                content: {
                    text: "I want to send you 10 USDI",
                },
            },
            {
                user: "{{agentName}}",
                content: {
                    text: "Okay, I'm creating an invoice to receive 10 USDI...",
                    action: "NEW_INVOICE"
                }
            }
        ]
    ],
};
