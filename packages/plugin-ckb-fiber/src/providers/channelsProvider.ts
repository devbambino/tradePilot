import {
    Provider,
    IAgentRuntime,
    Memory,
    State,
    elizaLogger,
} from "@elizaos/core";
import {CKBFiberService, ServiceTypeCKBFiber} from "../ckb/fiber/service.ts";
import {formatChannelList, formatNodeInfo} from "../ckb/fiber/formatter.ts";

export const channelsProvider: Provider = {
    get: async (runtime: IAgentRuntime, message: Memory, state: State) => {
        // Data retrieval logic for the provider
        const service = runtime.getService<CKBFiberService>(ServiceTypeCKBFiber);

        return formatChannelList(await service.rpcClient.listChannels());
    },
};
