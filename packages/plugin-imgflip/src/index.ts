import { type Plugin } from "@elizaos/core";
import { generateMemeAction, generateMemeActionHandler, type Meme } from "./actions";

export { generateMemeAction, generateMemeActionHandler };
export type { Meme };

export const imgflipPlugin: Plugin = {
    name: "imgflip",
    description: "Generate memes using imgflip.com",
    actions: [generateMemeAction],
    evaluators: [],
    providers: [],
};
export default imgflipPlugin;
