import {
    elizaLogger,
    type IAgentRuntime,
    type Memory,
    type State,
    type HandlerCallback,
} from "@elizaos/core";
import { WalletProvider } from "../providers/wallet";

export default {
    name: "CREATE_TON_WALLET",
    similes: ["NEW_TON_WALLET", "CREATE_WALLET"],
    description:
        "Creates a new TON wallet on demand. Returns the public address and mnemonic backup (store it securely). The wallet keypair is also encrypted to a file using the provided password.",
    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        state: State,
        _options: Record<string, unknown>,
        callback?: HandlerCallback,
    ) => {
        elizaLogger.log("Starting CREATE_TON_WALLET action...");

        try {
            // Get the export password from settings.
            const password = runtime.getSetting("TON_WALLET_EXPORT_PASSWORD");
            if (!password) {
                throw new Error("Missing TON_WALLET_EXPORT_PASSWORD in settings.");
            }

            // Generate a new wallet for on-demand creation using the provided password.
            const { walletProvider, mnemonic } = await WalletProvider.generateNew(runtime, password);
            const walletAddress = walletProvider.getAddress();
            const result = {
                status: "success",
                walletAddress,
                mnemonic, // IMPORTANT: The mnemonic backup must be stored securely!
                message: "New TON wallet created. Store the mnemonic securely for recovery.",
            };

            if (callback) {
                callback({
                    text: JSON.stringify(result, null, 2),
                    content: result,
                });
            }

            return true;
        } catch (error: any) {
            elizaLogger.error("Error creating wallet:", error);
            if (callback) {
                callback({
                    text: `Error creating wallet: ${error.message}`,
                    content: { error: error.message },
                });
            }
            return false;
        }
    },
    validate: async (_runtime: IAgentRuntime) => true,
    examples: [
        [
            {
                user: "{{user1}}",
                content: {
                    text: "Please create a new TON wallet for me.",
                    action: "CREATE_TON_WALLET",
                },
            },
            {
                user: "{{user1}}",
                content: {
                    text: "New TON wallet created. Wallet Address: EQAXxxxxxxxxxxxxxxxxxxxxxx. Please securely store your mnemonic.",
                },
            },
        ],
    ],
}; 