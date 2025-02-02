import { createClient } from '@supabase/supabase-js';
import { TwitterApi } from 'twitter-api-v2';
import dotenv from 'dotenv';
import { Tweet, ProcessedTweet } from '../types';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase credentials');
}

const supabase = createClient(supabaseUrl, supabaseKey);

console.log('Env vars loaded:', {
    hasTwitterKey: !!process.env.TWITTER_API_KEY,
    hasTwitterSecret: !!process.env.TWITTER_API_SECRET,
    hasAccessToken: !!process.env.TWITTER_ACCESS_TOKEN,
    hasAccessSecret: !!process.env.TWITTER_ACCESS_SECRET
  });

const twitterClient = new TwitterApi({
  appKey: process.env.TWITTER_API_KEY!,
  appSecret: process.env.TWITTER_API_SECRET!,
  accessToken: process.env.TWITTER_ACCESS_TOKEN!,
  accessSecret: process.env.TWITTER_ACCESS_SECRET!,
});

function processTweet(tweet: Tweet): ProcessedTweet {
  const isReply = tweet.referenced_tweets?.some(t => t.type === 'replied_to') ?? false;
  const isQuote = tweet.referenced_tweets?.some(t => t.type === 'quoted') ?? false;
  const isRetweet = tweet.referenced_tweets?.some(t => t.type === 'retweeted') ?? false;

  return {
    tweet_id: tweet.id,
    content: tweet.text,
    created_at: tweet.created_at,
    author_id: tweet.author_id,
    conversation_id: tweet.conversation_id,
    in_reply_to_user_id: tweet.in_reply_to_user_id,
    is_reply: isReply,
    is_quote: isQuote,
    is_retweet: isRetweet,
    retweet_count: tweet.public_metrics.retweet_count,
    reply_count: tweet.public_metrics.reply_count,
    like_count: tweet.public_metrics.like_count,
    quote_count: tweet.public_metrics.quote_count,
  };
}

// Function to fetch tweets for a user
async function fetchUserTweets(username: string) {
  try {
    // First get the user ID
    const user = await twitterClient.v2.userByUsername(username);
    if (!user.data) {
      throw new Error(`User ${username} not found`);
    }

    const userId = user.data.id;
    console.log(`Fetching tweets for user ${username} (ID: ${userId})`);

    // Fetch tweets
    const tweets = await twitterClient.v2.userTimeline(userId, {
      max_results: 100, // Adjust as needed
      "tweet.fields": [
        "created_at",
        "conversation_id",
        "in_reply_to_user_id",
        "referenced_tweets",
        "public_metrics",
      ],
    });

    const processedTweets: ProcessedTweet[] = [];

    for await (const tweet of tweets) {
      const processedTweet = processTweet(tweet as Tweet);
      processedTweets.push(processedTweet);
    }

    return processedTweets;
  } catch (error) {
    console.error('Error fetching tweets:', error);
    throw error;
  }
}

// Function to fetch tweets mentioning a user
async function fetchMentions(username: string) {
  try {
    const user = await twitterClient.v2.userByUsername(username);
    if (!user.data) {
      throw new Error(`User ${username} not found`);
    }

    const userId = user.data.id;
    console.log(`Fetching mentions for user ${username} (ID: ${userId})`);

    const mentions = await twitterClient.v2.userMentionTimeline(userId, {
      max_results: 100, // Adjust as needed
      "tweet.fields": [
        "created_at",
        "conversation_id",
        "in_reply_to_user_id",
        "referenced_tweets",
        "public_metrics",
      ],
    });

    const processedMentions: ProcessedTweet[] = [];

    for await (const mention of mentions) {
      const processedMention = processTweet(mention as Tweet);
      processedMentions.push(processedMention);
    }

    return processedMentions;
  } catch (error) {
    console.error('Error fetching mentions:', error);
    throw error;
  }
}

// Function to store tweets in Supabase
async function storeTweetsInSupabase(tweets: ProcessedTweet[]) {
  try {
    const { data, error } = await supabase
      .from('tweets')
      .upsert(tweets, {
        onConflict: 'tweet_id',
      });

    if (error) {
      throw error;
    }

    console.log(`Successfully stored ${tweets.length} tweets`);
    return data;
  } catch (error) {
    console.error('Error storing tweets in Supabase:', error);
    throw error;
  }
}

// Main function to collect and store Twitter data
async function collectTwitterData(username: string) {
  try {
    // Fetch and store user's tweets
    const tweets = await fetchUserTweets(username);
    await storeTweetsInSupabase(tweets);
    console.log(`Processed ${tweets.length} tweets from ${username}`);

    // Fetch and store mentions
    const mentions = await fetchMentions(username);
    await storeTweetsInSupabase(mentions);
    console.log(`Processed ${mentions.length} mentions for ${username}`);

  } catch (error) {
    console.error('Error in collectTwitterData:', error);
    throw error;
  }
}

// Export the main function
export { collectTwitterData };


if (require.main === module) {
  const targetUsername = process.env.TARGET_TWITTER_USERNAME;
  
  if (!targetUsername) {
    console.error('Please set TARGET_TWITTER_USERNAME in your environment variables');
    process.exit(1);
  }

  collectTwitterData(targetUsername)
    .then(() => {
      console.log('Twitter data collection completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Twitter data collection failed:', error);
      process.exit(1);
    });
}