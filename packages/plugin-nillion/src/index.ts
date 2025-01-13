import { Plugin } from "@elizaos/core";
import { uploadToNilDb } from "./actions/upload";
import { readFromNilDb } from "./actions/retrieve";

export const nillionPlugin: Plugin = {
    name: "Nillion",
    description: "A plugin to manage secrets in nilDB using secure MPC",
    actions: [uploadToNilDb, readFromNilDb],
    evaluators: [],
    providers: [],
};

export default nillionPlugin;
