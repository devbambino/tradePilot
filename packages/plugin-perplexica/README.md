# @elizaos/plugin-perplexica

A plugin that integrates [Perplexica's](https://github.com/ItzCrazyKns/Perplexica) web search capabilities into Eliza agents, enabling them to access real-time information from the internet. This adapter allows agents to find and utilize up-to-date information from web pages, academic sources, and other online platforms.

## Overview

In the Eliza framework, when composing "context" which is the core information that an agent passes to the LLM to generate responses and decide actions, the context is constructed from static data including predefined character bios, lore, and knowledge (through RAG). By integrating the Perplexica search engine, agents gain access to a broader knowledge pool and can respond with real-time information like weather conditions, current time, stock prices, and much more. This significantly enhances the agent's ability to provide up-to-date and relevant responses beyond their static knowledge base.

Perplexica search is integrated into Eliza as a plugin that adds a new service, implementing the `IPerplexicaSearchService` interface. This service is used to search the web for information relevant to the agent's current state and response.


## Usage

1. First, set up Perplexica search engine by following the instructions at [Perplexica Installation Guide](https://github.com/ItzCrazyKns/Perplexica?tab=readme-ov-file#installation)

2. Configure the Perplexica search engine in your .env file:

```
# Perplexica Configuration
PERPLEXICA_API_URL=                         # Default: http://localhost:3001/api/search
PERPLEXICA_MODEL_PROVIDER=                  # Default: openai
PERPLEXICA_MODEL_NAME=                      # Default: gpt-4o-mini
PERPLEXICA_EMBEDDING_MODEL_PROVIDER=        # Default: openai
PERPLEXICA_EMBEDDING_MODEL_NAME=            # Default: text-embedding-3-large
```

3. Edit the character file to enable the Perplexica search plugin:

```
...

"plugins": ["@elizaos/plugin-perplexica"]

...
```

4. Modify the client to use the Perplexica search service. For example, in the Telegram client, modify the `messageManager.ts` file to use the Perplexica search service:

```
import { IPerplexicaSearchService } from "@elizaos/plugin-perplexica";

export class MessageManager {
    // Main handler for incoming messages
    public async handleMessage(ctx: Context): Promise<void> {
        ...

        // Create additional state keys
        let stateAdditionalKeys: { [key: string]: string } = {};

        // Get perplexity search result
        const searchResult = await this.runtime.getService<IPerplexicaSearchService>(ServiceType.PERPLEXICA_SEARCH).search(
            `${messageText} (says to ${this.runtime.character.name}, please reply in a short paragraph)`
        );
        stateAdditionalKeys["searchResult"] = `# Web Search Results (ignore if irrelevant)\n${searchResult.message}`;

        // Update state with the new memory
        let state = await this.runtime.composeState(memory, stateAdditionalKeys);
        state = await this.runtime.updateRecentMessageState(state);

        ...
    }
}
```

5. Start the agent as usual.
