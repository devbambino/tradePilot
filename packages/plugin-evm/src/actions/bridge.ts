import {
    IAgentRuntime,
    Memory,
    State,
    composeContext,
    generateObjectDeprecated,
    ModelClass,
} from "@elizaos/core";
import {
    createConfig,
    executeRoute,
    ExtendedChain,
    getRoutes,
} from "@lifi/sdk";
import { zeroAddress } from "viem";
import { initWalletProvider, WalletProvider } from "../providers/wallet";
import { bridgeTemplate } from "../templates";
import type { BridgeParams, Transaction } from "../types";
import { parseEther } from "viem";

export { bridgeTemplate };

export class BridgeAction {
    private config;

    constructor(private walletProvider: WalletProvider) {
        this.config = createConfig({
            integrator: "eliza",
            chains: Object.values(this.walletProvider.chains).map((config) => ({
                id: config.id,
                name: config.name,
                key: config.name.toLowerCase(),
                chainType: "EVM",
                nativeToken: {
                    ...config.nativeCurrency,
                    chainId: config.id,
                    address: "0x0000000000000000000000000000000000000000",
                    coinKey: config.nativeCurrency.symbol,
                },
                metamask: {
                    chainId: `0x${config.id.toString(16)}`,
                    chainName: config.name,
                    nativeCurrency: config.nativeCurrency,
                    rpcUrls: [config.rpcUrls.default.http[0]],
                    blockExplorerUrls: [config.blockExplorers.default.url],
                },
                diamondAddress: "0x0000000000000000000000000000000000000000",
                coin: config.nativeCurrency.symbol,
                mainnet: true,
            })) as ExtendedChain[],
        });
    }

    async bridge(params: BridgeParams): Promise<Transaction> {
        const walletClient = this.walletProvider.getWalletClient(
            params.fromChain
        );
        const [fromAddress] = await walletClient.getAddresses();

        const routes = await getRoutes({
            fromChainId: this.walletProvider.getChainConfigs(params.fromChain)
                .id,
            toChainId: this.walletProvider.getChainConfigs(params.toChain).id,
            // if user wants to bridge native token, setting fromToken to zero address
            fromTokenAddress: params.fromToken ? params.fromToken : zeroAddress,
            toTokenAddress: params.toToken ? params.toToken : zeroAddress,
            fromAmount: parseEther(params.amount).toString(),
            fromAddress: fromAddress,
            toAddress: params.toAddress || fromAddress,
        });

        if (!routes.routes.length) throw new Error("No routes found");

        const execution = await executeRoute(routes.routes[0], this.config);
        const process = execution.steps[0]?.execution?.process[0];

        if (!process?.status || process.status === "FAILED") {
            throw new Error("Transaction failed");
        }

        return {
            hash: process.txHash as `0x${string}`,
            from: fromAddress,
            to: routes.routes[0].steps[0].estimate
                .approvalAddress as `0x${string}`,
            value: BigInt(params.amount),
            chainId: this.walletProvider.getChainConfigs(params.fromChain).id,
        };
    }
}

export const bridgeAction = {
    name: "bridge",
    description: "Bridge tokens between different chains",
    handler: async (
        runtime: IAgentRuntime,
        _message: Memory,
        state: State,
        _options: any,
        callback?: any
    ) => {
        console.log("Bridge action handler called");
        const walletProvider = initWalletProvider(runtime);
        const action = new BridgeAction(walletProvider);

        // Get all chains from walletProvider
        const chains = Object.keys(walletProvider.chains);

        // Compose bridge context
        const bridgeContext = composeContext({
            state,
            template: bridgeTemplate,
        });
        const contextWithChains = bridgeContext.replace(
            "SUPPORTED_CHAINS",
            chains.map((item) => `"${item}"`).join("|")
        );

        // Generate bridge details object
        const content = await generateObjectDeprecated({
            runtime,
            context: contextWithChains,
            modelClass: ModelClass.SMALL,
        });

        const bridgeOptions: BridgeParams = {
            fromChain: content.fromChain,
            toChain: content.toChain,
            fromToken: content.token,
            toToken: content.token,
            toAddress: content.toAddress,
            amount: content.amount,
        };

        try {
            const bridgeResp = await action.bridge(bridgeOptions);
            if (callback) {
                callback({
                    text: `Successfully bridge ${bridgeOptions.amount} ${bridgeOptions.fromToken} tokens from ${bridgeOptions.fromChain} to ${bridgeOptions.toChain}\nTransaction Hash: ${bridgeResp.hash}`,
                    content: {
                        success: true,
                        hash: bridgeResp.hash,
                        recipient: bridgeResp.to,
                        chain: bridgeOptions.fromChain,
                    },
                });
            }
            return true;
        } catch (error) {
            console.error("Error in bridge handler:", error.message);
            if (callback) {
                callback({ text: `Error: ${error.message}` });
            }
            return false;
        }
    },
    template: bridgeTemplate,
    validate: async (runtime: IAgentRuntime) => {
        const privateKey = runtime.getSetting("EVM_PRIVATE_KEY");
        return typeof privateKey === "string" && privateKey.startsWith("0x");
    },
    examples: [
        [
            {
                user: "user",
                content: {
                    text: "Bridge 1 ETH from Ethereum to Base",
                    action: "CROSS_CHAIN_TRANSFER",
                },
            },
        ],
    ],
    similes: ["CROSS_CHAIN_TRANSFER", "CHAIN_BRIDGE", "MOVE_CROSS_CHAIN"],
}; // TODO: add more examples / similies
