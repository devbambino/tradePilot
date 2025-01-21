import { embed, Provider, stringToUuid } from "@elizaos/core";
import {
    ChainCatcherItem,
    ChainCatcherResponse,
    fetchChainCatcher,
} from "../utils/chainCatcher";

// interface FormattedMarketData {
//     symbol: string;
//     name: string;
//     price: string;
//     priceChange24h: string;
//     priceChange1h: string;
//     volume24h: string;
//     volume1h: string;
//     marketCap: string;
//     realMarketCap: string;
//     liquidity: string;
//     holders: string;
//     uniqueWallets24h: string;
//     uniqueWallets1h: string;
//     socialLinks: string[];
// }

// function formatNumber(num: number): string {
//     if (num >= 1e9) {
//         return `$${(num / 1e9).toFixed(2)}B`;
//     } else if (num >= 1e6) {
//         return `$${(num / 1e6).toFixed(2)}M`;
//     } else if (num >= 1e3) {
//         return `$${(num / 1e3).toFixed(2)}K`;
//     }
//     return `$${num.toFixed(2)}`;
// }

// function formatPercentage(num: number): string {
//     const sign = num > 0 ? "+" : "";
//     return `${sign}${num.toFixed(2)}%`;
// }

// function getSocialLinks(extensions: any): string[] {
//     const links = [];
//     if (extensions.website) links.push(`🌐 ${extensions.website}`);
//     if (extensions.twitter) links.push(`🐦 ${extensions.twitter}`);
//     if (extensions.telegram) links.push(`📱 ${extensions.telegram}`);
//     if (extensions.discord) links.push(`💬 ${extensions.discord}`);
//     return links;
// }

export const cryptoNewsData: Provider = {
    get: async (runtime, message, state) => {
        if (!message.content.action || message.content.action !== "TWEET") {
            return "";
        }

        try {
            // fetch several times
            const chainCatcher: ChainCatcherResponse =
                await fetchChainCatcher();
            const cacheManager = runtime.cacheManager;
            const articles: ChainCatcherItem[] = [];
            let output;

            for (const article of chainCatcher.data.list) {
                const cached = await cacheManager.get(
                    `cryptoNews_${article.id}`
                );
                if (!cached) {
                    // new acrticle
                    console.log(
                        `NEW ARTICLE : ${article.title} # ${article.id}`
                    );
                    // means it's not cached, then we push it to the articles
                    articles.push(article);
                    // cache it
                    await cacheManager.set(`cryptoNews_${article.id}`, article);
                    const embedding = await embed(runtime, article.description);
                    console.log("embedding", embedding);
                    // put the news to knowledge as well
                    await runtime.ragKnowledgeManager.createKnowledge({
                        id: stringToUuid(`cryptoNews_${article.id}`),
                        agentId: runtime.agentId,
                        content: {
                            text: article.description,
                            metadata: {
                                isMain: true,
                                isShared: true,
                                source: "articles",
                            },
                        },
                        embedding: new Float32Array(embedding),
                    });

                    // await runtime.knowledgeManager.createMemory({
                    //     // We namespace the knowledge base uuid to avoid id
                    //     // collision with the document above.
                    //     id: stringToUuid(`cryptoNews_${article.id}`),
                    //     agentId: runtime.agentId,
                    //     roomId: runtime.agentId,

                    //     userId: runtime.agentId,
                    //     createdAt: Date.now(),
                    //     content: {
                    //         text: article.description,
                    //         type: "news",
                    //     },
                    //     embedding,
                    // });
                } else {
                    console.log(
                        `ARTICLE ${article.id} is already cached, skipping`
                    );
                }
            }

            // const cryptoNews: SerperNewsResponse =
            //     await fetchSerperNews("crypto");
            // const suiNews: SerperNewsResponse = await fetchSerperNews("$SUI");
            if (articles.length > 0) {
                output = `# NEWS for ${runtime.character.name}\n\n`;
                // output += `The News have this format:\n\n`;
                // output += `
                // - Title <--- Title of the news\n
                // Description <--- Content of the news\n
                // Timestamp <--- the time of the news\n\n
                // `;

                chainCatcher.data.list.forEach((article) => {
                    output += `- ${article.title}\n${article.description}\nTime: ${article.releaseTime}\n\n`;
                });

                // cryptoNews.news.forEach((article) => {
                //     output += `- ${article.title}\n${article.snippet}\n\n`;
                // });
                // suiNews.news.forEach((article) => {
                //     output += `- ${article.title}\n${article.snippet}\n\n`;
                // });
                output += `# ADDITIONAL_NOTES: if there's any decimal numbers you should convert the decimal separator into comma instead of dot\n\n# END NEWS\n\n`;
            }

            // elizaLogger.log(output);

            return output;
        } catch (error) {
            console.error("Error in fetching news provider:", error);
            return "";
        }
    },
};
