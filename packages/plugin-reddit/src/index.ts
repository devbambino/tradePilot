import { Plugin } from "@ai16z/eliza";
import { createPost } from "./actions/post";
import { createComment } from "./actions/comment";
import { vote } from "./actions/vote";
import { redditProvider } from "./providers/redditProvider";

export const redditPlugin: Plugin = {
    name: "reddit",
    description: "Reddit Plugin for Eliza - Interact with Reddit posts, comments and voting",
    actions: [createPost, createComment, vote],
    providers: [redditProvider],
    evaluators: []
};

export default redditPlugin;
