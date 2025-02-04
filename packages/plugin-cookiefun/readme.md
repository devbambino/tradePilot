# Cookiefun Plugin

An ElizaOS plugin that integrates with Cookie.fun API to analyze social sentiment and engagement around cryptocurrency tokens on Twitter.

## Features

- Social Data Analysis
  - Real-time Twitter data via Cookie.fun API
  - Smart engagement scoring and filtering
  - Sentiment analysis on crypto discussions
  - Historical data analysis (up to 3 days)
  
- Advanced Tweet Processing
  - Engagement metrics (likes, retweets, replies, quotes)
  - Smart engagement point calculation
  - Custom scoring algorithm for tweet relevance
  - Automated formatting and date handling

- Natural Language Analysis
  - Token/topic extraction from user queries
  - Sentiment analysis of discussions
  - Price prediction identification
  - Technical analysis mention detection

## Installation

```bash
npm install @elizaos/plugin-cookiefun
```

## Prerequisites

The following environment variable needs to be configured:

- `COOKIE_FUN_API_KEY`: Your Cookie.fun API key

## Usage

```typescript
import { CookiefunApiService } from '@elizaos/plugin-cookiefun';
import { IAgentRuntime } from '@elizaos/core';

// Initialize the service
const cookieService = new CookiefunApiService();

// Search for tweets about a specific token
const tweets = await cookieService.searchTweets({
  query: "bitcoin",
  max_results: 10
});

// Search multiple queries with rate limiting
const multiTweets = await cookieService.searchMultipleQueries(
  ["bitcoin", "ethereum"],
  10
);
```

## API Integration

### Cookie.fun API Endpoints

The plugin uses Cookie.fun's search endpoint:
- Base URL: `https://api.cookie.fun/v1/hackathon`
- Endpoint: `/search/{query}`
- Rate Limit: 60 requests per minute

### Rate Limiting

Built-in rate limiting protection:
```typescript
{
  MAX_REQUESTS_PER_MINUTE: 60,
  RETRY_AFTER: 60 * 1000 // 1 minute cooldown
}
```

### Tweet Scoring

Custom scoring algorithm weighing different engagement metrics:
```typescript
{
  LIKES_WEIGHT: 1,
  REPLIES_WEIGHT: 3,
  RETWEETS_WEIGHT: 5,
  QUOTES_WEIGHT: 10,
  SMART_ENGAGEMENT_MULTIPLIER: 5
}
```

## Actions

### analyzeTweets

Main action for analyzing cryptocurrency discussions:

1. Extracts token/topic from user query
2. Fetches relevant tweets from Cookie.fun API
3. Analyzes tweets for:
   - Key news and announcements
   - Overall sentiment and engagement
   - Price predictions and technical analysis
4. Returns formatted analysis with top tweets

Example usage:
```typescript
const response = await runtime.executeAction("ANALYZE_TWEETS", {
  message: "What are people saying about Bitcoin?"
});
```

## Error Handling

The plugin includes comprehensive error handling for:
- API rate limiting
- Invalid queries
- Network failures
- Data formatting issues

## Response Format

Tweet analysis responses include:
- Main insights summary
- Sentiment analysis
- Top tweets by engagement
- Formatted dates and metrics
