import { Plugin } from "@elizaos/core";
import { processRobloxInteraction } from "./actions/processRobloxMessage";

export const robloxPlugin: Plugin = {
    name: "roblox",
    description: "Roblox plugin for Eliza",
    actions: [processRobloxInteraction],
    providers: [],
    evaluators: [],
    services: [],
    clients: [],
};
