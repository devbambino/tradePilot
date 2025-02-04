import type { Plugin } from "@elizaos/core";
import { evmWalletProvider } from "./providers/wallet.ts";

import { transferAction } from "./actions/transfer";
import { stakeAction } from "./actions/stake.ts";

export const seiPlugin: Plugin = {
    name: "sei",
    description: "Sei Plugin for Eliza",
    actions: [transferAction, stakeAction],
    evaluators: [],
    providers: [evmWalletProvider],
};

export default seiPlugin;
