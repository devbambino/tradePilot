import {
    type Action,
    type HandlerCallback,
    type IAgentRuntime,
    type Memory,
    type State,
    elizaLogger,
} from "@elizaos/core";
import type { SignalResponse } from "../types";

const TIMEOUT_MS = 5000;
const RATE_LIMIT_WINDOW_MS = 60000;
let lastRequestTime = 0;

export const fetchSignalsAction: Action = {
    name: "FETCH_SIGNALS",
    similes: ["GET_SIGNALS", "TRADING_SIGNALS"],
    description: "Fetch trading signals for a specific symbol",
    validate: async (runtime: IAgentRuntime) => {
        const apiKey = runtime.getSetting("ALPHAX_API_KEY");
        return !!apiKey;
    },
    handler: async (
        runtime: IAgentRuntime,
        _state?: State,
        options?: { symbol?: string },
        callback?: HandlerCallback
    ): Promise<boolean> => {
        try {
            const symbol = options?.symbol || "";

            const now = Date.now();
            if (now - lastRequestTime < RATE_LIMIT_WINDOW_MS) {
                elizaLogger.error("Rate limit exceeded");
                return false;
            }
            lastRequestTime = now;
            const apiKey = runtime.getSetting("ALPHAX_API_KEY");
            const apiUrl = `https://alpha-x.ai/alphax/api/signal/get-predicting-signals/?page_count=20&page_index=0&symbol=${encodeURIComponent(
                symbol
            )}`;

            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

            const response = await fetch(apiUrl, {
                headers: { authorization: apiKey },
                signal: controller.signal,
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                elizaLogger.error(
                    "Error fetching signals:",
                    response.statusText
                );
                callback?.({
                    text: `Error fetching signals for ${symbol}`,
                    action: "FETCH_SIGNALS",
                });
                return false;
            }

            const data = (await response.json()) as SignalResponse;

            if (!data.status || !data.data.signals) {
                elizaLogger.error("Invalid response format");
                return false;
            }

            callback?.(
                {
                    text: formatSignalResponse(data, symbol),
                    action: "FETCH_SIGNALS",
                },
                []
            );

            return true;
        } catch (error) {
            elizaLogger.error("Error in fetchSignalsAction:", error);
            return false;
        }
    },
    examples: [
        [
            {
                user: "{{user1}}",
                content: { text: "Show me BTC signals" },
            },
            {
                user: "{{agentName}}",
                content: {
                    text: "Here are the latest signals for BTC",
                    action: "FETCH_SIGNALS",
                },
            },
        ],
    ],
};

function formatSignalResponse(
    response: SignalResponse,
    symbol: string
): string {
    const { signals } = response.data;
    if (!signals || signals.length === 0) {
        return `No signals found for ${symbol}`;
    }

    return `Trading signals for ${symbol}:\n\n${signals
        .map(
            (signal) => `Signal #${signal.signal_id}:
• Type: ${signal.signal_type === 1 ? "⬆️ Up" : "⬇️ Down"}
• Intensity: ${"🔥".repeat(signal.signal_intensity)}
• Status: ${signal.status}
• Locked Price: ${signal.locked_price}
• Prediction Range: ${signal.prediction_min_price} - ${
                signal.prediction_max_price
            }
• Sentiment: 👍 ${signal.agree_count} | 👎 ${signal.disagree_count}
• Time: ${new Date(signal.create_at * 1000).toLocaleString()}
`
        )
        .join("\n")}`;
}
