import { Action, IAgentRuntime, Memory } from "@ai16z/eliza";

export const createPost: Action = {
    name: "CREATE_REDDIT_POST",
    similes: ["POST_TO_REDDIT", "SUBMIT_REDDIT_POST"],
    validate: async (runtime: IAgentRuntime, message: Memory) => {
        const hasCredentials = !!runtime.getSetting("REDDIT_CLIENT_ID") &&
                             !!runtime.getSetting("REDDIT_CLIENT_SECRET") &&
                             !!runtime.getSetting("REDDIT_REFRESH_TOKEN");
        const hasContent = message?.content?.text?.trim().length > 0;
        return hasCredentials && hasContent;
    },
    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        state: any,
        options: any
    ) => {
        const { reddit } = await runtime.getProvider("redditProvider");

        // Extract subreddit and content from message
        const subreddit = "test"; // You would parse this from message
        const title = "Test Post";
        const content = message.content.text;

        try {
            await reddit.submitSelfpost({
                subredditName: subreddit,
                title: title,
                text: content
            });
            return true;
        } catch (error) {
            console.error("Failed to create Reddit post:", error);
            return false;
        }
    },
    examples: [
        [
            {
                user: "{{user1}}",
                content: {
                    text: "Post this to r/test: Hello Reddit!"
                },
            },
            {
                user: "{{agentName}}",
                content: {
                    text: "I'll post that to Reddit for you",
                    action: "CREATE_REDDIT_POST",
                },
            },
        ],
    ],
};
