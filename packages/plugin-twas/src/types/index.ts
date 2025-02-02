export interface Tweet {
    id: string;
    text: string;
    created_at: string;
    author_id: string;
    conversation_id: string;
    in_reply_to_user_id: string | null;
    referenced_tweets?: {
      type: string;
      id: string;
    }[];
    public_metrics: {
      retweet_count: number;
      reply_count: number;
      like_count: number;
      quote_count: number;
    };
  }
  
  export interface ProcessedTweet {
    tweet_id: string;
    content: string;
    created_at: string;
    author_id: string;
    conversation_id: string;
    in_reply_to_user_id: string | null;
    is_reply: boolean;
    is_quote: boolean;
    is_retweet: boolean;
    retweet_count: number;
    reply_count: number;
    like_count: number;
    quote_count: number;
  }