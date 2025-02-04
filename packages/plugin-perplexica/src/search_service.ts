import {
    Memory,
    Actor,
    elizaLogger,
    Character,
    Service,
    IAgentRuntime,
    ServiceType
} from "@elizaos/core";

export interface IPerplexicaSearchService extends Service {
    settings: {
        [key: string]: string;
    };
    search(
        query: string,
        messages?: Memory[],
        actors?: Actor[],
        character?: Character,
        optimizationMode?: string,
        focusMode?: string,
    ): Promise<PerplexicaSearchResponse>;
}


export class PerplexicaSearchService extends Service implements IPerplexicaSearchService {
    settings: {[key: string]: string;};

    static get serviceType(): ServiceType {
      return ServiceType.PERPLEXICA_SEARCH;
  }

    async initialize(runtime: IAgentRuntime): Promise<void> {
      this.settings = {
        modelProvider: runtime.getSetting('PERPLEXICA_MODEL_PROVIDER') || 'openai',
        modelName: runtime.getSetting('PERPLEXICA_MODEL_NAME') || 'gpt-4o-mini',
        embeddingModelProvider: runtime.getSetting('PERPLEXICA_EMBEDDING_MODEL_PROVIDER') || 'openai',
        embeddingModelName: runtime.getSetting('PERPLEXICA_EMBEDDING_MODEL_NAME') || 'text-embedding-3-large',
        apiUrl: runtime.getSetting('PERPLEXICA_API_URL') || 'http://localhost:3001/api/search',
      }
    }

    async search(
        query: string,
        messages?: Memory[],
        actors?: Actor[],
        character?: Character,
        optimizationMode: 'speed' | 'balanced' | 'quality' = 'speed',
        focusMode: 'webSearch' | 'academicSearch' | 'writingAssistant' | 'wolframAlphaSearch' | 'youtubeSearch' | 'redditSearch' = 'webSearch',
    ): Promise<PerplexicaSearchResponse> {
        const history = formatPerplexicaSearchHistory(messages, actors, character?.name);

        elizaLogger.debug("Searching with Perplexica:\n",
            query, history, this.settings.optimizationMode, this.settings.focusMode);

        try {
          const searchRequest: SearchRequest = {
            chatModel: {
              provider: this.settings.modelProvider,
              model: this.settings.modelName,
            },
            embeddingModel: {
              provider: this.settings.embeddingModelProvider,
              model: this.settings.embeddingModelName,
            },
            optimizationMode: optimizationMode,
            focusMode: focusMode,
            query,
            history: history || []
          };
          elizaLogger.debug('Search request:', searchRequest);

          const response = await fetch(this.settings.apiUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json'
            },
            body: JSON.stringify(searchRequest),
          });

          if (!response.ok) {
            const errorText = await response.text();
            elizaLogger.error('Response error:', errorText);
            throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
          }

          const data = await response.json();
          elizaLogger.debug('Search response:', data);
          return data;
        } catch (error) {
          elizaLogger.error('Error searching Perplexica:', error);
          return {
            message: 'Unknown error occurred',
            sources: []
          };
        }
    }
}

interface ChatModel {
  provider: string;
  model: string;
}

interface SearchRequest {
  chatModel: ChatModel;
  embeddingModel: ChatModel;
  optimizationMode: string;
  focusMode: string;
  query: string;
  history?: [string, string][];
}

export interface PerplexicaSearchResponse {
    message: string;
    sources: {
      pageContent: string;
      metadata: {
        title: string;
        url: string;
      };
    }[];
  }

function formatPerplexicaSearchHistory(
    messages: Memory[],
    actors: Actor[],
    agentName: string,
): [string, string][] {
    return messages
        .slice(0, 6)  // limit to 6 messages
        .reverse()
        .filter((message) => message.userId)
        .map((message) => {
            const messageContent = message.content.text;
            const formattedName =
                actors.find((actor) => actor.id === message.userId)?.name === agentName
                    ? "assistant"
                    : "human";

            return [formattedName, messageContent];
        });
}
