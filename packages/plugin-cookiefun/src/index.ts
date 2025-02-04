import type { Plugin } from "@elizaos/core";
import analyzeTweets from "./actions/analyzeTweets";
import CookiefunApiService from "./services/cookiefunApi";

export const cookiefunPlugin: Plugin = {
    name: "cookiefun",
    description: "Cookie.fun plugin for Eliza",
    actions: [analyzeTweets],
    evaluators: [],
    services: [new CookiefunApiService()],
};

export default cookiefunPlugin;
