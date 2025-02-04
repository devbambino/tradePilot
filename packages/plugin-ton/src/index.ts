import type { Action, Plugin } from "@elizaos/core";
import transferAction from "./actions/transfer.ts";
import { WalletProvider, nativeWalletProvider } from "./providers/wallet.ts";
import batchTransferAction from "./actions/batchTransfer.ts";

export { WalletProvider, transferAction as TransferTonToken, batchTransferAction as BatchTransferTonToken };

export const tonPlugin: Plugin = {
    name: "ton",
    description: "Ton Plugin for Eliza",
    actions: [transferAction, batchTransferAction as Action],
    evaluators: [],
    providers: [nativeWalletProvider],
}

export default tonPlugin;
