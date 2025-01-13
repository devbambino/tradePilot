import {
    Action,
    IAgentRuntime,
    Memory,
    State,
    composeContext,
    elizaLogger,
    ModelClass,
    generateText,
} from "@elizaos/core";
import { Scraper } from "agent-twitter-client";
import { followTemplate } from "../templates";
import { isFollowContent } from "../types";

async function getUsername(
    runtime: IAgentRuntime,
    _message: Memory,
    state?: State
): Promise<string> {
    try {
        const context = composeContext({
            state,
            template: followTemplate,
        });

        const username = await generateText({
            runtime,
            context,
            modelClass: ModelClass.SMALL,
        });

        if (!isFollowContent(username)) {
            elizaLogger.error("Invalid username:", username);
            return;
        }

        return username;
    } catch (error) {
        elizaLogger.error("Error getting username:", error);
        return;
    }
}

async function followUser(content: string): Promise<boolean> {
    try {
        const scraper = new Scraper();
        const username = process.env.TWITTER_USERNAME;
        const password = process.env.TWITTER_PASSWORD;
        const email = process.env.TWITTER_EMAIL;
        const twitter2faSecret = process.env.TWITTER_2FA_SECRET;

        if (!username || !password) {
            elizaLogger.error(
                "Twitter credentials not configured in environment"
            );
            return false;
        }

        elizaLogger.log("Attempting to login to Twitter as:", username);
        // Login with credentials
        await scraper.login(username, password, email, twitter2faSecret);
        if (!(await scraper.isLoggedIn())) {
            elizaLogger.error("Failed to login to Twitter");
            return false;
        }
        elizaLogger.log("Successfully logged in to Twitter");

        // Send the tweet
        const contentWithoutAt = content.slice(1);
        elizaLogger.log("Attempting to follow user:", contentWithoutAt);
        try {
            await scraper.followUser(contentWithoutAt);
        } catch (error) {
            elizaLogger.error("Error following user:", error);
            return false;
        }

        return true;
    } catch (error) {
        elizaLogger.error("Error following user:", error);
        return false;
    }
}

export const followAction: Action = {
    name: "FOLLOW_USER",
    similes: ["FOLLOW", "FOLLOW_USER", "FOLLOW_USER_ON_X", "FOLLOW_USER_ON_TWITTER"],
    description: "Follow a user on Twitter",
    validate: async (
        runtime: IAgentRuntime,
        message: Memory,
        state?: State
    ) => {
        const hasCredentials =
            !!process.env.TWITTER_USERNAME && !!process.env.TWITTER_PASSWORD;
        elizaLogger.log(`Has credentials: ${hasCredentials}`);

        return hasCredentials;
    },
    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        state?: State
    ): Promise<boolean> => {
        try {
            // determine which user to follow
            const username = await getUsername(runtime, message, state);

            if (!username) {
                elizaLogger.error("No username generated for follow");
                return false;
            }

            elizaLogger.log(`Found username: ${username}`);

            // Check for dry run mode - explicitly check for string "true"
            if (
                process.env.TWITTER_DRY_RUN &&
                process.env.TWITTER_DRY_RUN.toLowerCase() === "true"
            ) {
                elizaLogger.info(
                    `Dry run: would have followed user: ${username}`
                );
                return true;
            }

            return await followUser(username);
        } catch (error) {
            elizaLogger.error("Error in post action:", error);
            return false;
        }
    },
    examples: [
        [
            {
                user: "{{user1}}",
                content: { text: "Can you follow me?" },
            },
            {
                user: "{{agentName}}",
                content: {
                    text: "I'll follow you right away!",
                    action: "FOLLOW_USER",
                },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: { text: "Let's follow each other" },
            },
            {
                user: "{{agentName}}",
                content: {
                    text: "Ok sounds good.",
                    action: "FOLLOW_USER",
                },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: { text: "Follow me on X @username}" },
            },
            {
                user: "{{agentName}}",
                content: {
                    text: "I'll follow you right away!",
                    action: "FOLLOW_USER",
                },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: { text: "Follow me on X https://x.com/elonmusk" },
            },
            {
                user: "{{agentName}}",
                content: {
                    text: "Sure thing!",
                    action: "FOLLOW_USER",
                },
            },
        ],
    ],
};
