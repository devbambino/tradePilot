import { dnaProvider } from "./providers/dnaProvider";
import { Plugin } from "@elizaos/core";

export * from "./providers/dnaProvider";

export const aimePlugin: Plugin = {
    name: "aime",
    description: "AIME On-Chain DNA Plugin",
    actions: [],
    evaluators: [],
    providers: [dnaProvider],
};

export default dnaProvider;
