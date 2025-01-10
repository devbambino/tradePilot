import fs from "fs";
import path from "path";
import crypto from "crypto";
import { IAgentRuntime } from "../../../core/src/types";

interface State {
  recentMessages?: string;
  topics?: string;
  postDirections?: string;
  recentInteractions?: string;
  agentName?: string;
}

// 表情符号库
const EMOJIS = {
  positive: ["😊", "🎉", "✨", "🌟", "💫", "🔥", "💪", "👍", "🙌", "❤️"],
  thinking: ["🤔", "💭", "🧐", "🤓", "📝", "💡", "🎯", "🔍", "📊", "🗣️"],
  tech: ["💻", "🤖", "🚀", "⚡", "🔧", "🛠️", "📱", "🌐", "🔌", "💾"],
  nature: ["🌿", "🌺", "🌸", "🌼", "🌞", "🌙", "🌍", "🌈", "☀️", "🌊"],
  fun: ["😄", "🎮", "🎨", "🎭", "🎪", "🎡", "🎢", "🎬", "🎵", "🎹"],
  time: ["⏰", "⌛", "⏳", "📅", "🗓️", "⚡", "🕒", "📆", "🔄", "⏱️"]
};

// 推文风格
const TWEET_STYLES = {
  standard: (text: string) => text,
  question: (text: string) => `🤔 ${text}?`,
  announcement: (text: string) => `📢 ${text}!`,
  thought: (text: string) => `💭 ${text}...`,
  excited: (text: string) => `✨ ${text}! 🎉`,
  list: (text: string) => text.split(",").map((item, i) => `${i + 1}. ${item.trim()}`).join("\\n")
};

// 随机选择表情
function selectEmoji(category: keyof typeof EMOJIS): string {
  const emojis = EMOJIS[category];
  return emojis[Math.floor(Math.random() * emojis.length)];
}

// 生成文本变体
function generateVariant(text: string, style: keyof typeof TWEET_STYLES): string {
  return TWEET_STYLES[style](text);
}

// 图片配置接口
interface ImageConfig {
  url: string;
  category: string;
  tags: string[];
}

// 图片集合
const IMAGE_SETS: Record<string, ImageConfig[]> = {
  tech: [
    { url: "https://source.unsplash.com/random/1200x630/?technology", category: "tech", tags: ["technology", "innovation"] },
    { url: "https://source.unsplash.com/random/1200x630/?coding", category: "tech", tags: ["coding", "programming"] }
  ],
  nature: [
    { url: "https://source.unsplash.com/random/1200x630/?nature", category: "nature", tags: ["nature", "landscape"] },
    { url: "https://source.unsplash.com/random/1200x630/?sunset", category: "nature", tags: ["sunset", "beautiful"] }
  ],
  business: [
    { url: "https://source.unsplash.com/random/1200x630/?business", category: "business", tags: ["business", "work"] },
    { url: "https://source.unsplash.com/random/1200x630/?office", category: "business", tags: ["office", "professional"] }
  ]
};

// 图片管理器类
class ImageManager {
  private cache: Map<string, { path: string; timestamp: number }> = new Map();
  private readonly cacheDir = "./cache/images";
  private readonly cacheExpiry = 7 * 24 * 60 * 60 * 1000; // 7天缓存过期

  constructor() {
    // 确保缓存目录存在
    if (!fs.existsSync(this.cacheDir)) {
      fs.mkdirSync(this.cacheDir, { recursive: true });
    }
  }

  async downloadImage(url: string): Promise<string> {
    const response = await fetch(url);
    const buffer = await response.arrayBuffer();
    const fileName = crypto.randomUUID() + ".jpg";
    const filePath = path.join(this.cacheDir, fileName);

    await fs.promises.writeFile(filePath, Buffer.from(buffer));
    this.cache.set(url, { path: filePath, timestamp: Date.now() });

    return filePath;
  }

  async getImage(url: string): Promise<string> {
    const cached = this.cache.get(url);
    if (cached && Date.now() - cached.timestamp < this.cacheExpiry) {
      return cached.path;
    }
    return this.downloadImage(url);
  }

  async cleanupOldCache(): Promise<void> {
    const now = Date.now();
    for (const [url, { path, timestamp }] of this.cache.entries()) {
      if (now - timestamp > this.cacheExpiry) {
        await fs.promises.unlink(path);
        this.cache.delete(url);
      }
    }
  }
}

// 选择图片
function selectImage(category?: string): ImageConfig {
  const categories = category ? [category] : Object.keys(IMAGE_SETS);
  const selectedCategory = categories[Math.floor(Math.random() * categories.length)];
  const images = IMAGE_SETS[selectedCategory];
  return images[Math.floor(Math.random() * images.length)];
}

// 生成带图片的推文
export async function generateTweetWithImage(
  runtime: IAgentRuntime,
  state: State,
  style: keyof typeof TWEET_STYLES = "standard"
): Promise<{ text: string; image?: string }> {
  const text = await generateTweetText(runtime, state);
  const mood = determineMood(text);
  const emoji = selectEmoji(mood);
  const styledText = generateVariant(text, style);
  const finalText = `${styledText} ${emoji}`.trim();

  const image = selectImage(mood);
  const imageManager = new ImageManager();
  const imagePath = await imageManager.getImage(image.url);

  return {
    text: finalText,
    image: imagePath
  };
}

// 确定文本情感
function determineMood(text: string): keyof typeof EMOJIS {
  // 简单的情感分析逻辑
  if (text.includes("!") || text.includes("amazing") || text.includes("great")) {
    return "positive";
  }
  if (text.includes("?") || text.includes("wonder") || text.includes("think")) {
    return "thinking";
  }
  if (text.includes("code") || text.includes("tech") || text.includes("AI")) {
    return "tech";
  }
  return "positive"; // 默认返回积极情感
}

// 推文模板
export const tweetTemplate = `
# Context
{{recentMessages}}

# Topics
{{topics}}

# Post Directions
{{postDirections}}

# Recent interactions between {{agentName}} and other users:
{{recentPostInteractions}}

# Task
Generate a tweet that:
1. Relates to the recent conversation or requested topic
2. Matches the character's style and voice
3. Is concise and engaging
4. Must be UNDER 180 characters (this is a strict requirement)
5. Speaks from the perspective of {{agentName}}
6. May include relevant emojis based on the content mood
7. Uses varied sentence structures and expressions

Generate only the tweet text, no other commentary.`;

// 生成推文文本
async function generateTweetText(runtime: IAgentRuntime, state: State): Promise<string> {
  // 使用模板生成基础文本
  const context = tweetTemplate
    .replace("{{recentMessages}}", state.recentMessages || "")
    .replace("{{topics}}", state.topics || "")
    .replace("{{postDirections}}", state.postDirections || "")
    .replace("{{recentPostInteractions}}", state.recentInteractions || "")
    .replace("{{agentName}}", state.agentName || "Agent");

  // 使用运行时的文本生成功能
  return runtime.generateText({
    context,
    maxTokens: 100,
    temperature: 0.7
  });
}

// 通过URL下载图片
export async function downloadImageFromUrl(url: string): Promise<string> {
  const imageManager = new ImageManager();
  try {
    const imagePath = await imageManager.getImage(url);
    return imagePath;
  } catch (error) {
    console.error("Error downloading image:", error);
    throw new Error(`Failed to download image from ${url}`);
  }
}

// 生成带自定义图片URL的推文
export async function generateTweetWithCustomImage(
  runtime: IAgentRuntime,
  state: State,
  imageUrl: string,
  style: keyof typeof TWEET_STYLES = "standard"
): Promise<{ text: string; image?: string }> {
  const text = await generateTweetText(runtime, state);
  const mood = determineMood(text);
  const emoji = selectEmoji(mood);
  const styledText = generateVariant(text, style);
  const finalText = `${styledText} ${emoji}`.trim();

  try {
    const imagePath = await downloadImageFromUrl(imageUrl);
    return {
      text: finalText,
      image: imagePath
    };
  } catch (error) {
    console.error("Error processing custom image:", error);
    return {
      text: finalText
    };
  }
}
