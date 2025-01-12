import {
    Action,
    IAgentRuntime,
    Memory,
    HandlerCallback,
    State,
    elizaLogger,
} from "@elizaos/core";

import {CKBFiberService, ServiceTypeCKBFiber} from "../ckb/fiber/service.ts";
import {formatNodeInfo} from "../ckb/fiber/formatter.ts";

export const getInfo: Action = {
    name: "GET_NODE_INFO",
    similes: ["GET_NODE", "GET_INFO", "SHOW_INFO", "SHOW_NODE"],
    description: "Get fiber node information",
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
            const nodeInfo = await service.rpcClient.getNodeInfo();
            const formattedInfo = formatNodeInfo(nodeInfo);

            callback({ text: formattedInfo, action: "LIST_CHANNELS" }, []);
        } catch (error) {
            elizaLogger.error("Error getting node info:", error);
            callback(
                { text: "Fail to get node information. Please try again later." },
                []
            );
        }
    },
    examples: [
        [
            {
                user: "{{user1}}",
                content: {
                    text: "Get your node information",
                },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: {
                    text: "Show your node info",
                },
            }
        ],
    ],
};
