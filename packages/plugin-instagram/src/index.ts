// src/index.ts
import { Plugin } from "@elizaos/core";
import { postAction } from "./actions/post";

export const instagramPlugin: Plugin = {
    name: "instagram",
    description: "Instagram integration plugin for posting content",
    actions: [postAction],
    evaluators: [],
    providers: [],
};

export default instagramPlugin;