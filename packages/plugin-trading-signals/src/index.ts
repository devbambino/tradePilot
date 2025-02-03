import type { Plugin } from "@elizaos/core";
import { fetchSignalsAction } from "./actions/fetchSignalsAction";

export const tradingSignalsPlugin: Plugin = {
    name: "trading-signals",
    description: "Plugin for fetching trading signals from Alpha-X API",
    actions: [fetchSignalsAction],
};

export default tradingSignalsPlugin;
