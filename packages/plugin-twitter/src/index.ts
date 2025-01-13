import { Plugin } from "@elizaos/core";
import { postAction } from "./actions/post";
import { followAction } from "./actions/follow";

export const twitterPlugin: Plugin = {
    name: "twitter",
    description: "Twitter integration plugin for posting tweets and following users",
    actions: [postAction, followAction],
    evaluators: [],
    providers: [],
};

export default twitterPlugin;
