import type {Plugin} from "@elizaos/core";
import {tonConnect} from "./actions/tonConnect.ts";
import {showConnected} from "./actions/showConnected.ts";
import {disconnect} from "./actions/disconnect.ts";
import WalletProvider from "./providers/wallet.ts";

export const tonConnectPlugin: Plugin = {
    name: "ton-connect",
    description: "Ton Connect Plugin for Eliza",
    actions: [tonConnect, showConnected, disconnect],
    providers: [WalletProvider],
    services: [],
};

export default tonConnectPlugin;
