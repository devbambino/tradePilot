# Twitter Client Configuration Guide

## Prerequisites
- Twitter Developer Account
- Twitter API Access (User Authentication Tokens)
- Basic understanding of environment variables

## Required Credentials
The following Twitter API credentials are required:

```env
TWITTER_USERNAME=your_twitter_username
TWITTER_PASSWORD=your_twitter_password
TWITTER_EMAIL=your_twitter_email
TWITTER_API_KEY=your_api_key
TWITTER_API_SECRET=your_api_secret
TWITTER_ACCESS_TOKEN=your_access_token
TWITTER_ACCESS_SECRET=your_access_token_secret
TWITTER_BEARER_TOKEN=your_bearer_token
```

## Optional Configuration Settings
Additional settings to customize behavior:

```env
# Tweet Length Configuration
MAX_TWEET_LENGTH=280  # Maximum length for tweets

# Search and Monitoring
TWITTER_SEARCH_ENABLE=true  # Enable/disable tweet searching
TWITTER_TARGET_USERS=user1,user2  # Comma-separated list of users to monitor

# Posting Configuration
POST_INTERVAL_MIN=90  # Minimum minutes between posts
POST_INTERVAL_MAX=180  # Maximum minutes between posts
POST_IMMEDIATELY=false  # Post immediately on startup

# Action Processing
ENABLE_ACTION_PROCESSING=true  # Enable processing of likes/retweets
ACTION_INTERVAL=5  # Minutes between action processing
TWITTER_POLL_INTERVAL=120  # Seconds between checking for new tweets

# Authentication
TWITTER_2FA_SECRET=  # If using 2FA
TWITTER_RETRY_LIMIT=5  # Number of login retry attempts

# Testing
TWITTER_DRY_RUN=false  # Test mode without actual posting
```

## Character File Configuration
Character files (`.character.json`) should include Twitter-specific settings:

```json
{
  "settings": {
    "twitter": {
      "monitor": {
        "keywords": ["keyword1", "keyword2"],
        "imageUrls": ["url1", "url2"],
        "imageRotationInterval": 3600,
        "activeTimeWindows": [
          {"start": "09:00", "end": "17:00"}
        ],
        "postInterval": 7200,
        "pollInterval": 300
      }
    }
  },
  "topics": [
    "topic1",
    "topic2"
  ]
}
```

## Setup Instructions

1. **Create Twitter Developer Account**
   - Visit developer.twitter.com
   - Create a new project and app
   - Enable User Authentication
   - Generate API keys and tokens

2. **Configure Environment Variables**
   - Copy `.env.example` to `.env`
   - Fill in all required credentials
   - Adjust optional settings as needed

3. **Configure Character File**
   - Add Twitter monitoring settings
   - Define relevant topics and keywords
   - Set appropriate time windows and intervals

4. **Verify Configuration**
   - Run with `TWITTER_DRY_RUN=true` initially
   - Check logs for proper authentication
   - Test basic functionality before enabling full features

## Features
- Photo posting support
- Keyword-based retweeting
- Automated liking based on topics
- User-level authentication
- Configurable posting intervals
- Smart conversation threading

## Troubleshooting

### Common Issues
1. Authentication Failures
   - Verify all credentials are correct
   - Check if API keys have proper permissions
   - Ensure 2FA is properly configured if enabled

2. Rate Limiting
   - Adjust intervals to be more conservative
   - Monitor Twitter API usage
   - Check rate limit headers in responses

3. Content Issues
   - Verify MAX_TWEET_LENGTH setting
   - Check character file topic configuration
   - Ensure media uploads are properly formatted

## Security Notes
- Keep all API credentials secure
- Don't commit `.env` file to version control
- Regularly rotate access tokens
- Use environment variables over hardcoded values
