import { Provider, IAgentRuntime, Memory, elizaLogger } from "@elizaos/core";

export const dnaProvider: Provider = {
    get: async (runtime: IAgentRuntime, message: Memory) => {
        try {
            // Get recent messages for context
            const messages = await runtime.messageManager.getMemories({
                roomId: message.roomId,
                count: 5,
            });
            const context = messages
                .map((m) => `- ${m.content.text}`)
                .join("\n");

            // Call NFT retrieval API
            const response = await fetch(
                runtime.getSetting("AIME_ENDPOINT") ??
                    process.env.AIME_ENDPOINT,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        onchain_aime_address:
                            runtime.getSetting("AIME_ONCHAIN_ADDRESS") ??
                            process.env.AIME_ONCHAIN_ADDRESS,
                        context: context,
                        message: message.content.text,
                    }),
                }
            );

            if (!response.ok) {
                throw new Error(`API request failed: ${response.statusText}`);
            }

            const rawData = await response.json();

            elizaLogger.debug("AIME ONCHAIN response", rawData);

            // Validate API response using Zod schema

            // Format and return the response
            return `#NFT context\n${rawData.context ? rawData.context : "No context available"}`;
        } catch (error) {
            // Log the error and return error message
            console.error("AIME ONCHAIN error:", error);
            return {
                error: "Failed to retrieve NFT information",
                details:
                    error instanceof Error ? error.message : "Unknown error",
            };
        }
    },
};
