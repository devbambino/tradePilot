import {
    Action,
    IAgentRuntime,
    Memory,
    HandlerCallback,
    State,
    elizaLogger,
} from "@elizaos/core";

import {CKBFiberService, ServiceTypeCKBFiber} from "../ckb/fiber/service.ts";
import {formatChannelList, formatNodeInfo} from "../ckb/fiber/formatter.ts";

export const listChannels: Action = {
    name: "LIST_CHANNELS",
    similes: ["GET_CHANNELS", "SHOW_CHANNELS"],
    description: "List the open channels",
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
            const channels = await service.rpcClient.listChannels()
            const formattedInfo = formatChannelList(channels);

            callback({ text: formattedInfo }, []);
        } catch (error) {
            elizaLogger.error("Error getting channels:", error);
            callback(
                { text: "Fail to get channels. Please try again later." },
                []
            );
        }
    },
    examples: [
        [
            {
                user: "{{user1}}",
                content: {
                    text: "List the open channels",
                },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: {
                    text: "Show channels",
                },
            }
        ],
    ],
};
