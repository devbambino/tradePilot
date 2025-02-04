import {
    elizaLogger,
    type IAgentRuntime,
    type Memory,
    type State,
    type HandlerCallback,
} from "@elizaos/core";
import { WalletProvider } from "../providers/wallet";
import * as path from "node:path";

export default {
    name: "LOAD_TON_WALLET",
    similes: ["IMPORT_TON_WALLET", "LOAD_WALLET"],
    description:
        "Loads an existing TON wallet from an encrypted backup file using the provided password.",
    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        state: State,
        _options: Record<string, unknown>,
        callback?: HandlerCallback,
    ) => {
        elizaLogger.log("Starting LOAD_TON_WALLET action...");

        try {
            // Get the export password from settings.
            const password = runtime.getSetting("TON_WALLET_EXPORT_PASSWORD");
            if (!password) {
                throw new Error("Missing TON_WALLET_EXPORT_PASSWORD in settings.");
            }

            // Get the backup file path. You can pass the filePath via message content or via settings.
            let filePath: string | undefined = message.content?.filePath as string;
            if (!filePath) {
                filePath = runtime.getSetting("TON_WALLET_BACKUP_FILE");
            }
            if (!filePath) {
                throw new Error("No wallet backup file path provided via message or settings.");
            }

            // Resolve relative paths if needed.
            filePath = path.resolve(process.cwd(), filePath);
            const walletProvider = await WalletProvider.importWalletFromFile(runtime, password, filePath);
            const walletAddress = walletProvider.getAddress();

            const result = {
                status: "success",
                walletAddress,
                message: "Wallet imported successfully.",
            };

            if (callback) {
                callback({
                    text: JSON.stringify(result, null, 2),
                    content: result,
                });
            }

            return true;
        } catch (error: any) {
            elizaLogger.error("Error loading wallet:", error);
            if (callback) {
                callback({
                    text: `Error loading wallet: ${error.message}`,
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
                    text: "Please load my TON wallet.",
                    filePath: "ton_wallet_backups/EQAXxxxxxx_wallet_backup.json",
                    action: "LOAD_TON_WALLET",
                },
            },
            {
                user: "{{user1}}",
                content: {
                    text: "Wallet imported successfully. Wallet Address: EQAXxxxxxxxxxxxxxxxxxxxxxx.",
                },
            },
        ],
    ],
}; 