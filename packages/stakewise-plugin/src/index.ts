import { Plugin } from "@ai16z/eliza";
import { fetchVaultData } from "./actions/fetchVaultData";

export const stakewisePlugin: Plugin = {
    name: "stakewise-plugin",
    description: "A plugin to fetch StakeWise vault data.",
    actions: [fetchVaultData],
    evaluators: [],
    providers: [],
};
