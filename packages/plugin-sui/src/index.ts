import { Plugin } from "@elizaos/core";
import transferToken from "./actions/transfer.ts";
import movepump from "./actions/movepump.ts";
import { WalletProvider, walletProvider } from "./providers/wallet.ts";

export { WalletProvider, transferToken as TransferSuiToken };

export const suiPlugin: Plugin = {
    name: "sui",
    description: "Sui Plugin for Eliza",
    actions: [transferToken, movepump],
    evaluators: [],
    providers: [walletProvider],
};

export default suiPlugin;
