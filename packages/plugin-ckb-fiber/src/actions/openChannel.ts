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

const schema = z.object({
    peerId: z.string(),
    fundingAmount: z.number(),
    tokenType: z.string().optional(),
});

type Content = {
    peerId: string;
    fundingAmount: number;
    tokenType: string;
}

const template = `Respond with a JSON markdown block containing only the extracted values. Use null for any values that cannot be determined.

Example response:
\`\`\`json
{
    "peerId": "QmSqSsbjkQG6aMBNEkG6hMLKQpMjLW3eaBmUdCghpRWqwJ",
    "fundingAmount": 1000",
    "tokenType": "CKB"
}
\`\`\`

{{recentMessages}}

Given the recent messages, extract the following information about opening a channel:
- Peer ID (the ID of the peer node)
- Funding amount (the amount to fund the channel)
- Token type (e.g., "USDI", "CKB", default to "CKB")

Respond with a JSON markdown block containing only the extracted values.`

export const openChannel: Action = {
    name: "OPEN_CHANNEL",
    similes: ["CREATE_CHANNEL", "NEW_CHANNEL"],
    description: "Open a new payment channel with a peer",
    validate: async (runtime: IAgentRuntime, _message: Memory) => {
        if (!await runtime.getService<CKBFiberService>(ServiceTypeCKBFiber)?.checkNode()) {
            return false;
        }
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

            // Compose channel context
            const context = composeContext({ state, template });

            // Generate channel content
            const content = (await generateObject({
                runtime, context, modelClass: ModelClass.SMALL, schema
            })).object as Content;

            content.tokenType = content.tokenType || "ckb";
            const udtType = content.tokenType.toLowerCase() === "ckb" ? undefined : content.tokenType.toLowerCase();

            const tempChannelId = await service.openChannel(content.peerId, content.fundingAmount, true, udtType);
            
            callback(
                { 
                    text: `Successfully opened channel with peer ${content.peerId}. Temporary channel ID is: ${tempChannelId}, please wait for the channel to be accepted and ready. Notice: Once the channel is accepted by the remote node, this temporary channel ID will be disabled automatically.`,
                    channelId: tempChannelId
                },
                []
            );
        } catch (error) {
            elizaLogger.error("Error opening channel:", error);
            callback(
                { text: `Failed to open channel, message: ${error.message}` },
                []
            );
        }
    },
    examples: [
        [
            {
                user: "{{user1}}",
                content: {
                    text: "Open a channel with peer QmSqSsbjkQG6aMBNEkG6hMLKQpMjLW3eaBmUdCghpRWqwJ with 1000 CKB",
                },
            },
            {
                user: "{{agentName}}",
                content: {
                    text: "I'll help you open a channel with the specified peer. Let me process that for you.",
                },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: {
                    text: "Create a new USDI payment channel with QmSqSsbjkQG6aMBNEkG6hMLKQpMjLW3eaBmUdCghpRWqwJ, funding amount 500",
                },
            },
            {
                user: "{{agentName}}",
                content: {
                    text: "I'll help you create a USDI payment channel with the specified peer. Let me process that for you.",
                },
            },
        ],
    ],
};
