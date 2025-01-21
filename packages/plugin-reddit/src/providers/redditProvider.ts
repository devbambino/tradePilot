import { Provider, IAgentRuntime } from "@ai16z/eliza";
import Snoowrap from 'snoowrap';

export const redditProvider: Provider = {
    name: "redditProvider",
    description: "Provides Reddit API functionality",
    get: async (runtime: IAgentRuntime) => {
        const clientId = runtime.getSetting("REDDIT_CLIENT_ID");
        const clientSecret = runtime.getSetting("REDDIT_CLIENT_SECRET");
        const refreshToken = runtime.getSetting("REDDIT_REFRESH_TOKEN");
        const userAgent = runtime.getSetting("REDDIT_USER_AGENT");

        if (!clientId || !clientSecret || !refreshToken || !userAgent) {
            throw new Error("Missing Reddit credentials");
        }

        const reddit = new Snoowrap({
            userAgent,
            clientId,
            clientSecret,
            refreshToken
        });

        return { reddit };
    }
};
