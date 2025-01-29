import {
    getEmbeddingZeroVector,
    IAgentRuntime,
    type Memory,
    type UUID,
} from "@elizaos/core";
import type { NostrEvent } from "./types";
import { nostrEventUuid } from "./utils";

export function createNostrEventMemory({
    roomId,
    runtime,
    nostrEvent,
}: {
    roomId: UUID;
    runtime: IAgentRuntime;
    nostrEvent: NostrEvent;
}): Memory {
    return {
        id: nostrEventUuid({
            hash: nostrEvent.id,
            agentId: runtime.agentId,
        }),
        agentId: runtime.agentId,
        userId: runtime.agentId,
        content: {
            text: nostrEvent.content,
            source: "nostr",
            url: "",
            inReplyTo: undefined,
            hash: nostrEvent.id,
        },
        roomId,
        embedding: getEmbeddingZeroVector(),
    };
}

