# Twitter Plugin for Eliza

A powerful Twitter integration plugin that enables automated monitoring, posting, and interaction capabilities with advanced image handling and timing controls.

## Features

### Automated Twitter Monitoring and Interaction
- **Keyword-based Monitoring**: Monitor tweets containing specific keywords
- **User Tracking**: Follow and monitor up to 50 specific Twitter accounts
- **Smart Filtering**: Requires minimum 2 keyword matches for actions
- **Customizable Active Hours**: Set specific hours for bot activity (default: 7 AM - 11 PM)

### Advanced Tweet Generation
- **Dynamic Content**: Generates contextual tweets based on recent interactions
- **Multiple Tweet Styles**:
  - Standard posts
  - Questions
  - Announcements
  - Thoughts
  - Excited messages
  - Formatted lists
- **Smart Emoji Integration**: Automatically adds relevant emojis based on content mood
- **Character Limit Control**: Ensures all tweets are under 180 characters

### Image Management
- **Custom Image Support**:
  - Upload and use your own images via URLs
  - Automatic image rotation at specified intervals
  - Built-in image caching system (7-day cache)
- **Categorized Image Sets**:
  - Technology
  - Nature
  - Business
  - Custom categories
- **Image Processing**:
  - Automatic download and caching
  - Format validation
  - Error handling

### Interaction Features
- **Auto-Retweeting**: Automatically retweet matching content
- **Smart Quoting**: Generate contextual quote tweets
- **Auto-Replies**: Respond to relevant tweets automatically
- **Age Control**: Filter tweets based on their age (default: max 60 minutes old)

## Configuration Guide

### Basic Setup

1. Enable Twitter client in your character file:
```json
{
  "name": "YourBot",
  "clients": ["twitter"],
  "settings": {
    "twitter": {
      "monitor": {
        // Timing Controls
        "activeTimeStart": 7,        // Start activity at 7 AM
        "activeTimeEnd": 23,         // End activity at 11 PM
        "postInterval": 43200,       // Post every 12 hours (in seconds)
        "replyInterval": 7200,       // Reply every 2 hours (in seconds)
        "minTimeBetweenActions": 300,// Minimum 5 minutes between actions

        // Monitoring Settings
        "keywords": ["blockchain", "web3", "AI", "crypto"],
        "minKeywordMatches": 2,      // Require at least 2 keyword matches
        "users": [
          "vitalikbuterin",
          "elonmusk",
          "naval"
        ],
        "maxUsers": 50,

        // Image Settings
        "customImageUrls": [
          "https://your-domain.com/tech1.jpg",
          "https://your-domain.com/tech2.jpg",
          "https://your-domain.com/crypto1.jpg"
        ],
        "imageRotationInterval": 60, // Rotate images every 60 minutes

        // Interaction Controls
        "retweetEnabled": true,
        "quoteEnabled": true,
        "replyEnabled": true,
        "maxTweetAge": 60           // Only interact with tweets under 60 minutes old
      }
    }
  }
}
```

### Complete Configuration Example

```json
{
  "name": "CryptoBot",
  "description": "A bot that monitors and engages with crypto-related content",
  "clients": ["twitter"],
  "settings": {
    "twitter": {
      "username": "your_twitter_username",
      "monitor": {
        // Time Settings
        "activeTimeStart": 7,
        "activeTimeEnd": 23,
        "postInterval": 43200,      // 12 hours in seconds
        "replyInterval": 7200,      // 2 hours in seconds
        "minTimeBetweenActions": 300,

        // Content Monitoring
        "keywords": [
          "blockchain",
          "ethereum",
          "bitcoin",
          "web3",
          "defi"
        ],
        "minKeywordMatches": 2,
        "users": [
          "vitalikbuterin",
          "elonmusk",
          "naval",
          "cz_binance"
        ],

        // Image Configuration
        "customImageUrls": [
          "https://your-domain.com/images/crypto1.jpg",
          "https://your-domain.com/images/blockchain2.jpg",
          "https://your-domain.com/images/web3-3.jpg"
        ],
        "imageRotationInterval": 60,

        // Interaction Settings
        "retweetEnabled": true,
        "quoteEnabled": true,
        "replyEnabled": true,
        "maxTweetAge": 60
      }
    }
  }
}
```

## Usage

1. Install the plugin:
```bash
pnpm add @elizaos/plugin-twitter
```

2. Create your character configuration file (e.g., `mybot.json`)

3. Start Eliza with your custom character:
```bash
pnpm start --characters="path/to/mybot.json"
```

## Key Features Explained

### 1. Timed Posting
- Posts every 12 hours (`postInterval: 43200`)
- Active only between 7 AM and 11 PM (`activeTimeStart` and `activeTimeEnd`)
- Maintains minimum intervals between actions (`minTimeBetweenActions`)

### 2. Smart Retweeting
- Requires 2+ keyword matches (`minKeywordMatches: 2`)
- Monitors specific accounts (`users` array)
- Only retweets recent content (`maxTweetAge: 60`)

### 3. Image Management
- Rotates through custom images (`customImageUrls`)
- Never repeats images within the rotation interval
- Automatically caches downloaded images
- Validates image formats and handles errors

### 4. Interaction Control
- Configurable retweet, quote, and reply settings
- Time-based filtering of content
- Smart context-aware responses

## Important Notes

- All time intervals are in seconds
- Image URLs must be directly accessible
- The bot will automatically handle image downloading and caching
- Twitter API credentials should be configured in your `.env` file

## Implementation Details

The plugin consists of two main components:

1. `monitor.ts`: Handles the main monitoring logic
   - Tweet monitoring and filtering
   - Time-based controls
   - Interaction management

2. `templates.ts`: Manages tweet generation and image handling
   - Tweet template processing
   - Image downloading and caching
   - Emoji integration
   - Style variations

## Environment Variables

Required Twitter API credentials in `.env`:
```
TWITTER_API_KEY=your_api_key
TWITTER_API_SECRET=your_api_secret
TWITTER_ACCESS_TOKEN=your_access_token
TWITTER_ACCESS_TOKEN_SECRET=your_token_secret
```

## Error Handling

The plugin includes robust error handling for:
- Image download failures
- API rate limits
- Network issues
- Invalid configurations

## Contributing

Feel free to submit issues and enhancement requests!