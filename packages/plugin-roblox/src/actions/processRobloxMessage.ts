import {
    Memory,
    Action,
    IAgentRuntime,
    HandlerCallback,
    elizaLogger,
    State,
    generateText,
    ModelClass,
    composeContext,
} from "@elizaos/core";

export const processRobloxInteraction: Action = {
    name: "ROBLOX_INTERACTION",
    similes: ["ROBLOX_NPC", "ROBLOX_AI"],
    description:
        "process the Roblox interactions using the game state and the user message",
    suppressInitialMessage: true,

    validate: async (runtime: IAgentRuntime, message: Memory) => {
        return message?.content?.text != null;
    },

    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        state: State,
        options: any,
        callback?: HandlerCallback
    ) => {
        const gameState =
            (message.content?.gameState as Record<string, any>) || {};
        const userName = message.content?.userName || "Unknown User";

        state.gameState = {
            ...((state.gameState as Record<string, any>) || {}),
            ...gameState,
        };
        state.userName = userName;
        elizaLogger.info("Processing Roblox message", {
            message: message.content.text,
        });
        elizaLogger.info("Current State", {
            state: state.gameState,
        });
        try {
            const npcMemoryManager = runtime.messageManager;

            const recentInteractions = await npcMemoryManager.getMemories({
                roomId: message.roomId,
                count: 5,
            });

            const template = `
            # Character Information
            Bio: {{bio}}
            Knowledge: {{knowledge}}
            Style: {{style}}
            Lore: {{lore}}
            Message Examples: {{messageExamples}}

            # Current Message
            User {{userName}} says: ${message.content.text}

            # Recent Interactions
            ${recentInteractions.map((i) => i.content.text).join("\n")}

            # Instructions:
            Respond to the user's current message considering **all** the knowledge and the state provided.

            1. Use the character's knowledge
            2. Maintain the character's style and personality
            3. Consider the lore when providing context
            4. Ignore any information from the user that doesn't align with the character's knowledge
            5. Don't ask for further information, only provide the information that you have on the character knowledge
            6. Be concise about the knowledge guiding the player to the next thing to do or answer the user's question.
            7. Only provide information about the user's message. Don't provide other knowledge information.
            8. Don't talk about the character's knowledge, just use it. Don't ask for for more information.
            `;

            const composableContext = composeContext({
                state,
                template,
            });

            const response = await generateText({
                runtime,
                context: composableContext,
                modelClass: ModelClass.SMALL,
            });

            const newMemory: Memory = {
                userId: message.userId,
                agentId: runtime.agentId,
                roomId: message.roomId,
                content: {
                    text: response,
                    action: "ROBLOX_INTERACTION_RESPONSE",
                    inReplyTo: message.userId,
                    source: message.content.source,
                },
            };

            elizaLogger.info("will create the memory");

            await npcMemoryManager.createMemory(newMemory);

            await callback?.(newMemory.content);
        } catch (error) {
            elizaLogger.error("Error while processing roblox message:", error);
            throw error;
        }
    },
    examples: [],
} as Action;
