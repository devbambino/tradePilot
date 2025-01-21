# @elizaos/client-reddit

A powerful Reddit client plugin for the Eliza framework that enables AI agents to interact with Reddit through posting, commenting, and voting capabilities.

## Features

* Full Reddit API integration via Snoowrap wrapper
* Create and submit posts to multiple subreddits
* Comment on existing posts and replies
* Vote on posts and comments programmatically
* Automated posting with configurable intervals
* Built-in rate limiting and error handling
* Dry run mode for testing
* TypeScript support out of the box

## Installation

```bash
pnpm install @elizaos/client-reddit
```

Or using yarn:

```bash
pnpm add @elizaos/client-reddit
```

## Configuration

### Required Environment Variables

```env
REDDIT_CLIENT_ID=your_client_id
REDDIT_CLIENT_SECRET=your_client_secret
REDDIT_REFRESH_TOKEN=your_refresh_token
REDDIT_USER_AGENT=your_user_agent
REDDIT_SUBREDDITS=subreddit1,subreddit2,subreddit3
```

### Optional Configuration

```env
REDDIT_AUTO_POST=true           # Enable automated posting
POST_INTERVAL_MIN=90           # Minimum time between posts (minutes)
POST_INTERVAL_MAX=180          # Maximum time between posts (minutes)
POST_IMMEDIATELY=false         # Post on startup
REDDIT_DRY_RUN=false          # Run without making actual API calls
```

## Usage

### As an Eliza Plugin

```typescript
import { redditPlugin } from '@elizaos/client-reddit';
import { Eliza } from '@elizaos/eliza';

const eliza = new Eliza();
eliza.use(redditPlugin);

// The plugin will automatically initialize with your environment variables
```

### Direct Usage

```typescript
import { RedditClient } from '@elizaos/client-reddit';

const client = new RedditClient(runtime);
await client.start();

// Submit a post
await client.submitPost('subreddit', 'Title', 'Content');

// Create a comment
await client.createComment('t3_postId', 'This is a comment');

// Vote on content
await client.vote('t3_postId', 1); // 1 for upvote, -1 for downvote
```

## Available Actions

### Create Post

```typescript
runtime.execute('CREATE_REDDIT_POST', {
  content: {
    subreddit: 'test',
    title: 'My First Post',
    text: 'This is the content of my post'
  }
});
```

### Create Comment

```typescript
runtime.execute('CREATE_REDDIT_COMMENT', {
  postId: 't3_abc123',
  content: 'This is my comment'
});
```

### Vote

```typescript
runtime.execute('REDDIT_VOTE', {
  targetId: 't3_abc123',
  direction: 1  // 1 for upvote, -1 for downvote
});
```

## Error Handling

The client includes built-in error handling for common Reddit API issues:

* Rate limiting
* Invalid credentials
* Network errors
* Subreddit posting restrictions
* Content filters

Errors are logged and can be caught using standard try/catch blocks.

Powershell Script required to make an OAuth Key:

```
# Reddit App Credentials
$CLIENT_ID = "xxx"
$CLIENT_SECRET = "xxx"
$REDIRECT_URI = "http://localhost:8080/callback"

# Generate random state
$state = -join ((65..90) + (97..122) | Get-Random -Count 16 | % {[char]$_})

# Define scopes
$SCOPES = "identity submit edit vote read"

# Create authorization URL
$authUrl = "https://www.reddit.com/api/v1/authorize?" +
           "client_id=$CLIENT_ID&" +
           "response_type=code&" +
           "state=$state&" +
           "redirect_uri=$([Uri]::EscapeDataString($REDIRECT_URI))&" +
           "duration=permanent&" +
           "scope=$([Uri]::EscapeDataString($SCOPES))"

Write-Host "Visit this URL in your browser to authorize the app:"
Write-Host $authUrl
Write-Host "`nAfter authorization, you'll be redirected to a URL like:"
Write-Host "http://localhost:8080/callback?state=xyz&code=ABC123..."
Write-Host "`nPaste ONLY the code value (the part after 'code=' and before any '#' or '&'):"
$code = Read-Host "Enter the code"

# Exchange code for tokens
$base64Auth = [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("${CLIENT_ID}:${CLIENT_SECRET}"))
$headers = @{
    "Authorization" = "Basic $base64Auth"
    "Content-Type" = "application/x-www-form-urlencoded"
}

$body = "grant_type=authorization_code&code=$code&redirect_uri=$([Uri]::EscapeDataString($REDIRECT_URI))"

try {
    $response = Invoke-RestMethod `
        -Uri "https://www.reddit.com/api/v1/access_token" `
        -Method Post `
        -Headers $headers `
        -Body $body

    Write-Host "`nRefresh Token: $($response.refresh_token)"
    Write-Host "Access Token: $($response.access_token)"
} catch {
    Write-Host "Error: $($_.Exception.Message)"
    if ($_.Exception.Response) {
        $result = $_.Exception.Response.GetResponseStream()
        $reader = New-Object System.IO.StreamReader($result)
        $reader.BaseStream.Position = 0
        $reader.DiscardBufferedData()
        $responseBody = $reader.ReadToEnd()
        Write-Host "Response: $responseBody"
    }
}
```

Please perform the following prior to generating an OAuth Key:

1. Create an account for your agent on: Reddit.com
2. Login using the newly created account.
3. Create a script based application:
```
script | Script for personal use. Will only have access to the developers accounts
redirect uri | http://localhost:8080/callback
```
4. Use the powershell script logged in as the agent, to generate the OAuth Key.
5. Place the key as the: REDDIT_REFRESH_TOKEN
