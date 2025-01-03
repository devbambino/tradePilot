import { Plugin } from "@elizaos/core";
import transferAction from "./actions/transfer.ts";
import { WalletProvider, nativeWalletProvider } from "./providers/wallet.ts";

export { WalletProvider, transferAction as TransferCardanoToken };

export const cardanoPlugin: Plugin = {
    name: "cardano",
    description: "Cardano Plugin for Eliza",
    actions: [transferAction],
    evaluators: [],
    providers: [nativeWalletProvider],
};

export default cardanoPlugin;
