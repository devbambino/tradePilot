import {
    ActionExample,
    composeContext,
    elizaLogger,
    generateObjectDeprecated,
    HandlerCallback,
    ModelClass,
    type IAgentRuntime,
    type Memory,
    type State,
} from "@elizaos/core";
import { WalletProvider } from "../providers/wallet";
import { createTokenTemplate } from "../templates";
import type { Transaction, TokenCreationParameters } from "../types";
import erc20FactoryArtifacts from "../contracts/artifacts/ERC20Factory.json";
import { encodeFunctionData, Hex } from "viem";
export const factoryAddress = "0xB22D28b7197e787942098Ef65C1562e1AF2496F9";
export class CreateTokenAction {
    constructor(private walletProvider: WalletProvider) {
        this.walletProvider = walletProvider;
    }

    async create(params: TokenCreationParameters): Promise<Transaction> {
        const walletClient = this.walletProvider.getWalletClient(
            params.fromChain
        );

        const txData = encodeFunctionData({
            abi: erc20FactoryArtifacts,
            functionName: "createToken",
            args: [params.name, params.symbol, params.tokenOwner],
        });

        try {
            const chainConfig = this.walletProvider.getChainConfigs(
                params.fromChain
            );
            const publicClient = this.walletProvider.getPublicClient(
                params.fromChain
            );

            const hash = await walletClient.sendTransaction({
                account: walletClient.account,
                to: factoryAddress,
                value: BigInt(0),
                data: txData as Hex,
                chain: chainConfig,
                kzg: undefined,
            });

            await publicClient.waitForTransactionReceipt({ hash });

            return {
                hash,
                from: walletClient.account.address,
                to: factoryAddress,
                value: BigInt(0),
                data: txData as Hex,
                chainId: chainConfig.id,
            };
        } catch (error) {
            throw new Error(`Token creation failed: ${error.message}`);
        }
    }
}

const buildCreateTokenDetails = async (
    state: State,
    runtime: IAgentRuntime,
    wp: WalletProvider
): Promise<TokenCreationParameters> => {
    const context = composeContext({
        state,
        template: createTokenTemplate,
    });

    const chains = Object.keys(wp.chains);

    const contextWithChains = context.replace(
        "SUPPORTED_CHAINS",
        chains.map((item) => `"${item}"`).join("|")
    );

    const createTokenDetails = (await generateObjectDeprecated({
        runtime,
        context: contextWithChains,
        modelClass: ModelClass.SMALL,
    })) as TokenCreationParameters;

    const existingChain = wp.chains[createTokenDetails.fromChain];

    if (!existingChain) {
        throw new Error(
            "The chain " +
            createTokenDetails.fromChain +
            " not configured yet. Add the chain or choose one from configured: " +
            chains.toString()
        );
    }

    return createTokenDetails;
};

export const createTokenAction = {
    name: "create",
    description: "Deploy a new ERC20 token using the ERC20Factory.",
    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        state: State,
        options: Record<string, unknown>,
        callback?: HandlerCallback
    ) => {
        elizaLogger.log("Starting CREATE_TOKEN handler...");

        try {
            const privateKey = runtime.getSetting(
                "FUSE_PRIVATE_KEY"
            ) as `0x${string}`;
            const walletProvider = new WalletProvider(privateKey);
            const action = new CreateTokenAction(walletProvider);
            // Compose create token context
            const paramOptions = await buildCreateTokenDetails(
                state,
                runtime,
                walletProvider
            );
            const transferResp = await action.create(paramOptions);

            if (callback) {
                callback({
                    text: `Token created successfully!\nTransaction Hash: ${transferResp.hash}`,
                    content: {
                        success: true,
                        hash: transferResp.hash,
                        factoryAddress: transferResp.to,
                        chain: paramOptions.fromChain,
                    },
                });
            }
            return true;
        } catch (error) {
            console.error("Error in token creation handler:", error.message);
            if (callback) {
                callback({ text: `Error: ${error.message}` });
            }
            return false;
        }
    },
    template: createTokenTemplate,
    validate: async (runtime: IAgentRuntime) => {
        const privateKey = runtime.getSetting("FUSE_PRIVATE_KEY");
        return typeof privateKey === "string" && privateKey.startsWith("0x");
    },
    examples: [
        [
            {
                user: "{{user1}}",
                content: {
                    text: "Deploy a new token called MyToken with symbol MTK and owner 0x1234567890abcdef1234567890abcdef12345678",
                },
            },
            {
                user: "{{agentName}}",
                content: {
                    text: "I'll deploy your new token now.",
                    action: "DEPLOY_TOKEN",
                },
            },
            {
                user: "{{agentName}}",
                content: {
                    text: "Successfully deployed MyToken (MTK) with 100000000 total supply.\nTransaction hash: 0xdde850f9257365fffffc11324726ebdcf5b90b01c6eec9b3e7ab3e81fde6f14b",
                },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: {
                    text: "Create a new token with name TestCoin, symbol TEST, and owner 0x1234567890abcdef1234567890abcdef12345678",
                },
            },
            {
                user: "{{agentName}}",
                content: {
                    text: "I'll deploy your token.",
                    action: "DEPLOY_TOKEN",
                },
            },
            {
                user: "{{agentName}}",
                content: {
                    text: "Successfully deployed TestCoin (TEST) with 100000000 total supply.\nTransaction: 0x4fed598033f0added272c3ddefd4d83a521634a738474400b27378db462a76ec",
                },
            },
        ],
    ] as ActionExample[][],

    similes: ["CREATE_TOKEN", "DEPLOY_TOKEN"],
};
