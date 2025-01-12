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
    channelId: z.string(),
    force: z.boolean().optional(),
});

type Content = {
    channelId: string;
    force?: boolean;
}

const template = `Respond with a JSON markdown block containing only the extracted values. Use null for any values that cannot be determined.

Example response:
\`\`\`json
{
    "channelId": "0x86e89949ffed979c6215fc3c013fb107c31c5b3041244f64d09b5472b60d0fe9",
    "force": false
}
\`\`\`

{{recentMessages}}

Given the recent messages, extract the following information about closing a channel:
- Channel ID (the unique identifier of the channel to close)
- Force close (whether to force close the channel, default to false)

Respond with a JSON markdown block containing only the extracted values.`

export const closeChannel: Action = {
    name: "CLOSE_CHANNEL",
    similes: ["SHUTDOWN_CHANNEL", "TERMINATE_CHANNEL"],
    description: "Close an existing payment channel",
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

            const nodeInfo = await service.rpcClient.getNodeInfo();
            
            await service.rpcClient.shutdownChannel({
                channel_id: content.channelId, 
                close_script: nodeInfo.default_funding_lock_script,
                force: content.force
            });
            
            callback(
                { 
                    text: `Successfully initiated channel closure for ${content.channelId}${content.force ? ' (force close)' : ''}. Please wait for the closure to complete.`,
                    channelId: content.channelId
                },
                []
            );
        } catch (error) {
            elizaLogger.error("Error closing channel:", error);
            callback(
                { text: `Failed to close channel, message: ${error.message}` },
                []
            );
        }
    },
    examples: [
        [
            {
                user: "{{user1}}",
                content: {
                    text: "Close channel 0x86e89949ffed979c6215fc3c013fb107c31c5b3041244f64d09b5472b60d0fe9",
                },
            },
            {
                user: "{{agentName}}",
                content: {
                    text: "I'll help you close the channel. Let me process that for you.",
                },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: {
                    text: "Force close channel 0x86e89949ffed979c6215fc3c013fb107c31c5b3041244f64d09b5472b60d0fe9",
                },
            },
            {
                user: "{{agentName}}",
                content: {
                    text: "I'll help you force close the channel. Let me process that for you.",
                },
            },
        ],
    ],
};
