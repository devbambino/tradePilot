import {
    ActionExample,
    Content,
    HandlerCallback,
    IAgentRuntime,
    Memory,
    ModelClass,
    State,
    composeContext,
    elizaLogger,
    generateObject,
    type Action,
} from "@elizaos/core";
import { z } from "zod";

import { getFullnodeUrl, SuiClient } from "@mysten/sui/client";
import { Transaction } from "@mysten/sui/transactions";
import { parseAccount, updateTokenBytecode, TokenMetadata } from "../utils";
import { TEMPLATE_COIN_BYTECODE } from "../template/bytecode";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";

type SuiNetwork = "mainnet" | "testnet" | "devnet" | "localnet";

// Constants for MovePump interaction
const MOVEPUMP_PACKAGE_ID =
    "0x638928d4cf7dd20a598e9d30d3626d61d94ffabee29bc7b861bef67d32110bb4";
const MOVEPUMP_CONFIGURATION_ID =
    "0xd746495d04a6119987c2b9334c5fefd7d8cff52a8a02a3ea4e3995b9a041ace4";
const SWAP_DEX_INFO_ID =
    "0x3f2d9f724f4a1ce5e71676448dc452be9a6243dac9c5b975a588c8c867066e92";
const CLOCK_ID =
    "0x0000000000000000000000000000000000000000000000000000000000000006";

export interface CreateAndBuyContent extends Content {
    tokenMetadata: {
        name: string;
        symbol: string;
        description: string;
        imageUrl: string;
        websiteUrl: string;
        twitterUrl: string;
        telegramUrl: string;
    };
    buyAmountToken: string | number;
}

function isCreateAndBuyContent(
    runtime: IAgentRuntime,
    content: any
): content is CreateAndBuyContent {
    elizaLogger.log("Content for create & buy", content);
    return (
        typeof content.tokenMetadata === "object" &&
        content.tokenMetadata !== null &&
        typeof content.tokenMetadata.name === "string" &&
        typeof content.tokenMetadata.symbol === "string" &&
        typeof content.tokenMetadata.description === "string" &&
        typeof content.tokenMetadata.imageUrl === "string" &&
        typeof content.tokenMetadata.websiteUrl === "string" &&
        typeof content.tokenMetadata.twitterUrl === "string" &&
        typeof content.tokenMetadata.telegramUrl === "string" &&
        (typeof content.buyAmountToken === "string" ||
            typeof content.buyAmountToken === "number")
    );
}

const tokenTemplate = `Respond with a JSON markdown block containing only the extracted values. Use null for any values that cannot be determined.

Example response:
\`\`\`json
{
    "tokenMetadata": {
        "name": "Test Token",
        "symbol": "TEST",
        "description": "A test token for demonstration",
        "imageUrl": "https://example.com/image.png",
        "websiteUrl": "https://example.com",
        "twitterUrl": "https://twitter.com/test",
        "telegramUrl": "https://t.me/test"
    },
    "buyAmountToken": "1"
}
\`\`\`

{{recentMessages}}

Given the recent messages, extract or generate the following information about the requested token creation:
- Token name
- Token symbol
- Token description
- Image URL
- Website URL
- Twitter URL
- Telegram URL
- Initial buy amount in Token

Respond with a JSON markdown block containing only the extracted values.`;

// Publish token module and return treasury cap and module ID
async function publishTokenModule(
    suiClient: SuiClient,
    suiAccount: Ed25519Keypair,
    tokenMetadata: TokenMetadata
): Promise<{ treasuryCap: any; publishedModule: any }> {
    // Update bytecode
    const bytecode = new Uint8Array(Buffer.from(TEMPLATE_COIN_BYTECODE, "hex"));
    console.log("Original bytecode length:", bytecode.length);

    const updated = await updateTokenBytecode(bytecode, tokenMetadata);
    console.log("Updated bytecode length:", updated.length);

    // Create and execute publish transaction
    const tx = new Transaction();
    tx.setGasBudget(100000000);

    const [upgradeCap] = tx.publish({
        modules: [Array.from(updated)],
        dependencies: ["0x1", "0x2"],
    });
    tx.transferObjects([upgradeCap], "0x2");

    const publishResult = await suiClient.signAndExecuteTransaction({
        signer: suiAccount,
        transaction: tx,
    });

    // Verify transaction status
    const txDetails = await suiClient.getTransactionBlock({
        digest: publishResult.digest,
        options: {
            showEffects: true,
            showEvents: true,
            showInput: true,
            showObjectChanges: true,
        },
    });

    if (txDetails.effects?.status?.status === "failure") {
        throw new Error(
            `Failed to publish token: ${txDetails.effects.status.error}`
        );
    }

    // Extract created objects
    const createdObjects = txDetails.objectChanges?.filter(
        (change) => change.type === "created"
    );

    const treasuryCap = createdObjects?.find((obj) =>
        obj.objectType.includes("::TreasuryCap<")
    );

    const publishedModule = txDetails.objectChanges?.find(
        (change) => change.type === "published"
    );

    if (!treasuryCap || !publishedModule) {
        throw new Error("Failed to find required objects after publish");
    }

    return { treasuryCap, publishedModule };
}

// Create token on MovePump and perform initial buy
async function createAndBuyOnMovePump(
    suiClient: SuiClient,
    suiAccount: Ed25519Keypair,
    createAndBuyContent: CreateAndBuyContent,
    treasuryCap: any,
    publishedModule: any
): Promise<string> {
    // Check gas balance
    const gasBalance = await suiClient.getBalance({
        owner: suiAccount.toSuiAddress(),
        coinType: "0x2::sui::SUI",
    });

    const minGasAmount = 20000000n;
    if (BigInt(gasBalance.totalBalance) <= minGasAmount) {
        throw new Error(
            `Insufficient balance: requires more than ${minGasAmount} SUI`
        );
    }

    // Create MovePump transaction
    const createTx = new Transaction();
    const [splitSuiCoin] = createTx.splitCoins(createTx.gas, [
        BigInt(gasBalance.totalBalance) - minGasAmount,
    ]);
    const buyAmountInToken = BigInt(
        Number(createAndBuyContent.buyAmountToken) * 1_000_000
    );

    createTx.moveCall({
        target: `${MOVEPUMP_PACKAGE_ID}::move_pump::create_and_first_buy`,
        typeArguments: [
            `${publishedModule.packageId}::${createAndBuyContent.tokenMetadata.symbol.toLowerCase()}::${createAndBuyContent.tokenMetadata.symbol.toUpperCase()}`,
        ],
        arguments: [
            createTx.object(MOVEPUMP_CONFIGURATION_ID),
            createTx.object(treasuryCap.objectId),
            createTx.object(SWAP_DEX_INFO_ID),
            splitSuiCoin,
            createTx.pure.u64(buyAmountInToken),
            createTx.object(CLOCK_ID),
            createTx.pure.string(createAndBuyContent.tokenMetadata.name),
            createTx.pure.string(createAndBuyContent.tokenMetadata.symbol),
            createTx.pure.string(createAndBuyContent.tokenMetadata.imageUrl),
            createTx.pure.string(createAndBuyContent.tokenMetadata.description),
            createTx.pure.string(createAndBuyContent.tokenMetadata.twitterUrl),
            createTx.pure.string(createAndBuyContent.tokenMetadata.telegramUrl),
            createTx.pure.string(createAndBuyContent.tokenMetadata.websiteUrl),
        ],
    });

    // Execute transaction
    const createResult = await suiClient.signAndExecuteTransaction({
        signer: suiAccount,
        transaction: createTx,
    });

    const txDetails = await suiClient.getTransactionBlock({
        digest: createResult.digest,
        options: {
            showEffects: true,
            showEvents: true,
            showInput: true,
            showObjectChanges: true,
        },
    });

    if (txDetails.effects?.status?.status === "failure") {
        throw new Error(
            `Failed to create token on MovePump: ${txDetails.effects.status.error}`
        );
    }

    return createResult.digest;
}

export default {
    name: "CREATE_AND_BUY_TOKEN",
    similes: [
        "CREATE_AND_PURCHASE_TOKEN",
        "DEPLOY_AND_BUY_TOKEN",
        "LAUNCH_TOKEN",
        "CREATE_TOKEN",
        "DEPLOY_TOKEN",
    ],
    validate: async (runtime: IAgentRuntime, message: Memory) => {
        return true;
    },
    description:
        "Create and deploy a new token on MovePump with initial liquidity (Mainnet only)",
    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        state: State,
        _options: { [key: string]: unknown },
        callback?: HandlerCallback
    ): Promise<boolean> => {
        elizaLogger.log("Starting CREATE_AND_BUY_TOKEN handler...");

        const network = runtime.getSetting("SUI_NETWORK");
        if (network !== "mainnet") {
            const errorMessage = "MovePump is only available on Sui mainnet";
            elizaLogger.error(errorMessage);
            if (callback) {
                callback({
                    text: errorMessage,
                    content: {
                        error: errorMessage,
                        network: network,
                    },
                });
            }
            return false;
        }

        if (!state) {
            state = (await runtime.composeState(message)) as State;
        } else {
            state = await runtime.updateRecentMessageState(state);
        }

        // Define schema for token metadata
        const tokenSchema = z.object({
            tokenMetadata: z.object({
                name: z.string(),
                symbol: z.string(),
                description: z.string(),
                imageUrl: z.string(),
                websiteUrl: z.string(),
                twitterUrl: z.string(),
                telegramUrl: z.string(),
            }),
            buyAmountToken: z.union([z.string(), z.number()]),
        });

        // Generate token metadata from context
        const tokenContext = composeContext({
            state,
            template: tokenTemplate,
        });

        const content = await generateObject({
            runtime,
            context: tokenContext,
            schema: tokenSchema,
            modelClass: ModelClass.SMALL,
        });

        const createAndBuyContent = content.object as CreateAndBuyContent;

        if (!isCreateAndBuyContent(runtime, createAndBuyContent)) {
            elizaLogger.error(
                "Invalid content for CREATE_AND_BUY_TOKEN action."
            );
            return false;
        }

        try {
            const suiAccount = parseAccount(runtime);
            const network = runtime.getSetting("SUI_NETWORK");

            // Validate token name and symbol
            if (
                createAndBuyContent.tokenMetadata.name.toLowerCase() ===
                createAndBuyContent.tokenMetadata.symbol.toLowerCase()
            ) {
                throw new Error("Token name and symbol cannot be the same");
            }

            const suiClient = new SuiClient({
                url: getFullnodeUrl(network as SuiNetwork),
            });

            // Step 1: Publish token module
            const { treasuryCap, publishedModule } = await publishTokenModule(
                suiClient,
                suiAccount,
                createAndBuyContent.tokenMetadata
            );

            // Step 2: Create on MovePump and buy
            const transactionDigest = await createAndBuyOnMovePump(
                suiClient,
                suiAccount,
                createAndBuyContent,
                treasuryCap,
                publishedModule
            );

            if (callback) {
                callback({
                    text: `Token ${createAndBuyContent.tokenMetadata.name} (${createAndBuyContent.tokenMetadata.symbol}) created successfully on MovePump!\nModule ID: ${publishedModule.packageId}\nTransaction: ${transactionDigest}\nView at: https://movepump.com/token/${publishedModule.packageId}::${createAndBuyContent.tokenMetadata.symbol.toLowerCase()}::${createAndBuyContent.tokenMetadata.symbol.toUpperCase()}`,
                    content: {
                        tokenInfo: {
                            symbol: createAndBuyContent.tokenMetadata.symbol,
                            moduleId: publishedModule.packageId,
                            name: createAndBuyContent.tokenMetadata.name,
                            transaction: transactionDigest,
                        },
                    },
                });
            }

            return true;
        } catch (error) {
            elizaLogger.error("Error during token creation:", error);
            if (callback) {
                callback({
                    text: `Error creating token: ${error.message}`,
                    content: { error: error.message },
                });
            }
            return false;
        }
    },

    examples: [
        [
            {
                user: "{{user1}}",
                content: {
                    text: "Create a new token called elizaOS with symbol ELIZA on MovePump and buy 1 ELIZA. Here's the token info: Description: Autonomous AI agents for everyone Image: https://api.movepump.com/uploads/eliza_689d10b870.jpeg Website: https://elizaos.ai Twitter: https://x.com/ai16zdao Telegram: https://t.me",
                },
            },
            {
                user: "{{user2}}",
                content: {
                    action: "CREATE_AND_BUY_TOKEN",
                    text: "Token elizaOS (ELIZA) created successfully on MovePump!\nModule ID: 0xf94928f8da383439908b5d0ae32dfaf51ff74a95f9ef46f9d1b97b007f5d68b4\nTransaction: 3G7PqwkDtCtZNvwXSM4cb7RVJPuZvLYycotf8P4rQ8L6\nView at: https://movepump.com/token/0xf94928f8da383439908b5d0ae32dfaf51ff74a95f9ef46f9d1b97b007f5d68b4::eliza::ELIZA",
                },
            },
        ],
    ] as ActionExample[][],
} as Action;
