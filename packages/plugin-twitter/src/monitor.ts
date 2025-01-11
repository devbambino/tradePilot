import { IAgentRuntime, Memory, State } from "@elizaos/core";
import { generateTweetWithImage, generateTweetWithCustomImage } from "./templates";

interface MonitorConfig {
  // 监控配置
  keywords: string[];              // 监控的关键词
  users: string[];                // 监控的用户
  maxUsers: number;               // 最大监控用户数(默认50)
  minKeywordMatches: number;      // 最少关键词匹配数(默认2)

  // 时间控制
  activeTimeStart: number;        // 活动开始时间(0-23)
  activeTimeEnd: number;          // 活动结束时间(0-23)
  pollInterval: number;           // 轮询间隔(秒)
  minTimeBetweenActions: number;  // 操作间隔(秒)

  // 转发设置
  retweetEnabled: boolean;        // 是否启用转发
  quoteEnabled: boolean;          // 是否启用引用
  replyEnabled: boolean;          // 是否启用回复
  maxTweetAge: number;           // 最大推文年龄(分钟)

  // 记录管理
  processedTweets: Set<string>;   // 已处理的推文ID
  lastActionTime: number;         // 上次操作时间

  // 图片设置
  customImageUrls?: string[];     // 自定义图片URL列表
  imageRotationInterval?: number; // 图片轮换间隔(分钟)
  lastImageIndex?: number;        // 上次使用的图片索引
  lastImageTime?: number;         // 上次使用图片的时间
}

const defaultConfig: Partial<MonitorConfig> = {
  maxUsers: 50,
  minKeywordMatches: 2,
  activeTimeStart: 7,
  activeTimeEnd: 23,
  pollInterval: 300,
  minTimeBetweenActions: 300,
  retweetEnabled: true,
  quoteEnabled: true,
  replyEnabled: true,
  maxTweetAge: 60,
  processedTweets: new Set(),
  lastActionTime: 0,
  customImageUrls: [],
  imageRotationInterval: 60,
  lastImageIndex: -1,
  lastImageTime: 0
};

// 获取下一个要使用的图片URL
function getNextImageUrl(config: MonitorConfig): string | undefined {
  if (!config.customImageUrls || config.customImageUrls.length === 0) {
    return undefined;
  }

  const now = Date.now();
  // 检查是否需要轮换图片
  if (now - config.lastImageTime < config.imageRotationInterval * 60 * 1000) {
    return undefined;
  }

  // 更新索引
  config.lastImageIndex = (config.lastImageIndex + 1) % config.customImageUrls.length;
  config.lastImageTime = now;

  return config.customImageUrls[config.lastImageIndex];
}

export async function monitorTwitter(
  runtime: IAgentRuntime,
  config: Partial<MonitorConfig>
): Promise<void> {
  const fullConfig = { ...defaultConfig, ...config };

  // 检查是否在活动时间内
  function isActiveTime(): boolean {
    const hour = new Date().getHours();
    return hour >= fullConfig.activeTimeStart && hour <= fullConfig.activeTimeEnd;
  }

  // 检查是否可以执行操作
  function canPerformAction(): boolean {
    const now = Date.now();
    if (now - fullConfig.lastActionTime < fullConfig.minTimeBetweenActions * 1000) {
      return false;
    }
    return true;
  }

  // 检查推文是否符合条件
  function matchesKeywords(text: string): boolean {
    const matches = fullConfig.keywords.filter(keyword =>
      text.toLowerCase().includes(keyword.toLowerCase())
    );
    return matches.length >= fullConfig.minKeywordMatches;
  }

  // 处理推文
  async function processTweet(tweet: any, state: State): Promise<void> {
    if (!canPerformAction()) return;
    if (fullConfig.processedTweets.has(tweet.id)) return;

    const tweetAge = (Date.now() - new Date(tweet.created_at).getTime()) / 1000 / 60;
    if (tweetAge > fullConfig.maxTweetAge) return;

    if (matchesKeywords(tweet.text)) {
      if (fullConfig.retweetEnabled) {
        await runtime.clients.twitter.retweet(tweet.id);
      }

      if (fullConfig.quoteEnabled) {
        const imageUrl = getNextImageUrl(fullConfig);
        const quoteContent = imageUrl
          ? await generateTweetWithCustomImage(runtime, state, imageUrl, "quote")
          : await generateTweetWithImage(runtime, state, "quote");
        await runtime.clients.twitter.quote(tweet.id, quoteContent.text, quoteContent.image);
      }

      if (fullConfig.replyEnabled) {
        const imageUrl = getNextImageUrl(fullConfig);
        const replyContent = imageUrl
          ? await generateTweetWithCustomImage(runtime, state, imageUrl, "reply")
          : await generateTweetWithImage(runtime, state, "reply");
        await runtime.clients.twitter.reply(tweet.id, replyContent.text, replyContent.image);
      }

      fullConfig.processedTweets.add(tweet.id);
      fullConfig.lastActionTime = Date.now();
    }
  }

  // 主监控循环
  while (true) {
    try {
      if (!isActiveTime()) {
        await new Promise(resolve => setTimeout(resolve, 60000));
        continue;
      }

      // 获取监控用户的最新推文
      for (const user of fullConfig.users.slice(0, fullConfig.maxUsers)) {
        const tweets = await runtime.clients.twitter.getUserTweets(user);
        const state = await runtime.composeState({} as Memory);

        for (const tweet of tweets) {
          await processTweet(tweet, state);
        }
      }

      // 搜索关键词
      const keywordTweets = await runtime.clients.twitter.searchTweets(
        fullConfig.keywords.join(" OR ")
      );
      const state = await runtime.composeState({} as Memory);

      for (const tweet of keywordTweets) {
        await processTweet(tweet, state);
      }

    } catch (error) {
      console.error("Error in Twitter monitor:", error);
    }

    await new Promise(resolve =>
      setTimeout(resolve, fullConfig.pollInterval * 1000)
    );
  }
}

// 导出监控动作
export const twitterMonitorAction = {
  name: "MONITOR_TWITTER",
  description: "Monitor Twitter for keywords and users",
  similes: ["watch twitter", "track tweets", "follow twitter"],
  handler: async (runtime: IAgentRuntime, message: Memory, state?: State) => {
    const config = {
      keywords: runtime.character.settings?.twitter?.keywords || [],
      users: runtime.character.settings?.twitter?.users || [],
      ...runtime.character.settings?.twitter?.monitor
    };

    monitorTwitter(runtime, config);
    return true;
  },
  validate: async () => true,
  examples: []
};