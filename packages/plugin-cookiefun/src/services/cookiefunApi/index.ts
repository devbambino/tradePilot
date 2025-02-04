import { IAgentRuntime, Service, ServiceType, elizaLogger } from "@elizaos/core";
import axios from 'axios';

import { COOKIE_CONFIG } from './config';
import { formatCookieData } from './formatters';
import type { CookieAPIResponse, EnhancedTweet, SearchTweetsParams } from './types';

export class CookiefunApiService extends Service {
    private apiKey: string;
    private baseUrl: string;
    private lastRequestTime: number = 0;
    private runtime!: IAgentRuntime;

    static get serviceType(): ServiceType {
        return ServiceType.WEB_SEARCH; // Using WEB_SEARCH as it's the closest match for social data
    }

    constructor() {
        super();
        this.baseUrl = COOKIE_CONFIG.BASE_URL;
    }

    async initialize(runtime: IAgentRuntime): Promise<void> {
        this.runtime = runtime;
        elizaLogger.info("🔄 Initializing Cookie.fun API Service...");

        try {
            // Get API key from runtime settings
            const apiKey = runtime.getSetting('COOKIE_FUN_API_KEY');
            
            if (!apiKey) {
                throw new Error('COOKIE_FUN_API_KEY is not set in environment variables');
            }
            
            this.apiKey = apiKey;
            elizaLogger.success("✅ Cookie.fun API Service initialized successfully");

        } catch (error) {
            elizaLogger.error("❌ Failed to initialize Cookie.fun API service:", error);
            throw error;
        }
    }

    private async checkRateLimit(): Promise<void> {
        const now = Date.now();
        const timeSinceLastRequest = now - this.lastRequestTime;
        if (timeSinceLastRequest < (60000 / COOKIE_CONFIG.RATE_LIMIT.MAX_REQUESTS_PER_MINUTE)) {
            await new Promise(resolve => setTimeout(resolve, 
                (60000 / COOKIE_CONFIG.RATE_LIMIT.MAX_REQUESTS_PER_MINUTE) - timeSinceLastRequest
            ));
        }
        this.lastRequestTime = Date.now();
    }

    async searchTweets(params: SearchTweetsParams): Promise<EnhancedTweet[]> {
        await this.checkRateLimit();
        elizaLogger.info("🔍 Searching tweets for query:", params.query);

        try {
            const from = new Date();
            from.setDate(from.getDate() - 3);
            const to = new Date();

            const response = await axios.get<CookieAPIResponse>(
                `${this.baseUrl}${COOKIE_CONFIG.ENDPOINTS.SEARCH_TWEETS}/${encodeURIComponent(params.query)}`,
                {
                    params: { 
                        from: from.toISOString(), 
                        to: to.toISOString(),
                        max_results: params.max_results || COOKIE_CONFIG.DEFAULT_MAX_RESULTS
                    },
                    headers: {
                        'x-api-key': this.apiKey,
                        'Content-Type': 'application/json'
                    }
                }
            );

            const formattedTweets = formatCookieData(response.data);
            elizaLogger.debug("📊 Retrieved tweets:", {
                count: formattedTweets.length,
                query: params.query
            });

            return formattedTweets;

        } catch (error) {
            elizaLogger.error("❌ Error searching tweets:", error);
            throw error;
        }
    }

    private async processBatch(queries: string[], maxResults: number): Promise<EnhancedTweet[]> {
        elizaLogger.debug("🔄 Processing batch of queries:", { count: queries.length });
        
        const batchPromises = queries.map(query => 
            this.searchTweets({ query, max_results: maxResults })
        );
        const results = await Promise.all(batchPromises);
        return results.flat();
    }

    async searchMultipleQueries(queries: string[], maxResults: number = 10): Promise<EnhancedTweet[]> {
        elizaLogger.info("🔍 Searching multiple queries:", { queries, maxResults });

        // Calculate actual requests we can make per minute considering weight
        const WEIGHT_PER_REQUEST = 12;
        const actualRequestsPerMinute = Math.floor(COOKIE_CONFIG.RATE_LIMIT.MAX_REQUESTS_PER_MINUTE / WEIGHT_PER_REQUEST);
        
        // Use a smaller batch size to be safe (3 requests per batch)
        const batchSize = Math.min(3, actualRequestsPerMinute);
        const allTweets: EnhancedTweet[] = [];
        
        try {
            // Process queries in smaller batches
            for (let i = 0; i < queries.length; i += batchSize) {
                const batch = queries.slice(i, i + batchSize);
                const batchResults = await this.processBatch(batch, maxResults);
                allTweets.push(...batchResults);
                
                // Add a longer delay between batches to respect the weighted rate limit
                if (i + batchSize < queries.length) {
                    await new Promise(resolve => setTimeout(resolve, 20000));
                }
            }
            
            elizaLogger.success("✅ Multiple queries search completed", {
                totalTweets: allTweets.length,
                queriesProcessed: queries.length
            });

            return allTweets;

        } catch (error) {
            elizaLogger.error("❌ Error in multiple queries search:", error);
            throw error;
        }
    }
}

export default CookiefunApiService;
