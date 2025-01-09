import { Plugin, IAgentRuntime, elizaLogger, Service, ServiceType } from "@elizaos/core";
import { TwitterApiClient } from "./client";
import { validateTwitterApiConfig } from "./environment";

export * from "./types";
export { TwitterApiClient } from "./client";
export { validateTwitterApiConfig } from "./environment";

class TwitterApiService extends Service {
    static serviceType = "TWITTER_SEARCH_API" as ServiceType;
    public client!: TwitterApiClient;

    async initialize(runtime: IAgentRuntime) {
        const config = await validateTwitterApiConfig(runtime);
        this.client = new TwitterApiClient(config);
        elizaLogger.info("Twitter API Service: Initialized successfully");
    }

    async cleanup() {
        // 清理资源的逻辑
        elizaLogger.info("Twitter API Service: Cleaning up...");
    }

    getClient() {
        return this.client;
    }
}

export const TwitterApiPlugin = {
    name: "twitter-api",
    description: "Twitter API integration using twitterapi.io service",

    async init(runtime: IAgentRuntime) {
        try {
            // 使用标准的 Service 类注册方式
            const twitterService = new TwitterApiService();
            await twitterService.initialize(runtime);
            runtime.registerService(twitterService);

            return {
                async cleanup() {
                    await twitterService.cleanup();
                }
            };
        } catch (error) {
            elizaLogger.error("Twitter API Plugin: Initialization failed", error);
            throw error;
        }
    }
} as Plugin;

export default TwitterApiPlugin;
