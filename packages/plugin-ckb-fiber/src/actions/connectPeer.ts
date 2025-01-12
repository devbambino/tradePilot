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
    address: z.string(),
});

type Content = {
    address: string;
}

const template = `Respond with a JSON markdown block containing only the extracted values. Use null for any values that cannot be determined.

Example response:
\`\`\`json
{
    "address": "/ip4/43.198.162.23/tcp/8228/p2p/QmSqSsbjkQG6aMBNEkG6hMLKQpMjLW3eaBmUdCghpRWqwJ"
}
\`\`\`

{{recentMessages}}

Given the recent messages, extract the following information about the peer connection:
- Address (the address of the peer node, e.g., "/ip4/43.198.162.23/tcp/8228/p2p/QmSqSsbjkQG6aMBNEkG6hMLKQpMjLW3eaBmUdCghpRWqwJ")

Respond with a JSON markdown block containing only the extracted values.`

export const connectPeer: Action = {
    name: "CONNECT_PEER",
    similes: ["CONNECT_NODE", "PEER_CONNECT"],
    description: "Connect to a peer node",
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

            // Compose connection context
            const context = composeContext({ state, template });

            // Generate connection content
            const content = (await generateObject({
                runtime, context, modelClass: ModelClass.SMALL, schema
            })).object as Content;
            
            await service.rpcClient.connectPeer({ address: content.address }); 
            
            callback(
                { text: `Successfully connected to peer ${content.address}` },
                []
            );
        } catch (error) {
            elizaLogger.error("Error connecting to peer:", error);
            callback(
                { text: `Failed to connect to peer, message: ${error.message}` },
                []
            );
        }
    },
    examples: [
        [
            {
                user: "{{user1}}",
                content: {
                    text: "Connect to peer /ip4/43.198.162.23/tcp/8228/p2p/QmSqSsbjkQG6aMBNEkG6hMLKQpMjLW3eaBmUdCghpRWqwJ",
                },
            },
            {
                user: "{{agentName}}",
                content: {
                    text: "I'll help you connect to the peer node. Let me process that for you.",
                },
            },
        ],
    ],
};
