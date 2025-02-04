import { ByteArray, formatEther, parseEther, type Hex } from "viem";
import {
    elizaLogger,
    Action,
    composeContext,
    generateObjectDeprecated,
    HandlerCallback,
    ModelClass,
    type IAgentRuntime,
    type Memory,
    type State,
} from "@elizaos/core";

import { initWalletProvider, WalletProvider } from "../providers/wallet";
import { StakeParams, type Transaction } from "../types";
import { STAKING_PRECOMPILE_ADDRESS, STAKING_PRECOMPILE_ABI } from "@sei-js/evm"

export const stakeTemplate = `You are an AI assistant specialized in staking tokens on the SEI network. Your task is to extract specific information from user messages and format it into a structured JSON response.

First, review the recent messages from the conversation:

<recent_messages>
{{recentMessages}}
</recent_messages>

Your goal is to extract the following information about the user's request to stake tokens:
1. Amount to stake in SEI
2. Validator address

Before providing the final JSON output, show your reasoning process inside <analysis> tags. Follow these steps:

1. Identify the relevant information from the user's message:
   - Quote the part mentioning the amount to stake.
   - Quote the part mentioning the validator address.

2. Validate each piece of information:
   - Amount: Attempt to convert the amount to a number to verify it's valid.
   - Address: Check that it starts with "seivaloper".

3. If any information is missing or invalid, prepare an appropriate error message.

4. If all information is valid, summarize your findings.

5. Prepare the JSON structure based on your analysis.

After your analysis, provide the final output in a JSON markdown block. All fields are required. The JSON should have this structure:
\`\`\`json
{
    "amount": string,
    "validatorAddress": string,
}
\`\`\`

Remember:
- The amount should be a string representing the SEI amount without any currency symbol.
- The recipient address must be a valid SEI address startng with "sei1".

Now, process the user's request and provide your response.
`;

export class StakeAction {
    constructor(private walletProvider: WalletProvider) {}

    async stake(params: StakeParams): Promise<Transaction> {
        const chain = this.walletProvider.getCurrentChain()
        elizaLogger.log(
            `Staking: ${params.amount} SEI on validator (${params.validatorAddress} on ${chain.name})`
        );

        const walletClient = this.walletProvider.getEvmWalletClient();
        if (!walletClient.account) {
            throw new Error("Wallet client account is undefined");
        }

        try {
            const result = await walletClient.writeContract({
                address: STAKING_PRECOMPILE_ADDRESS,
                abi: STAKING_PRECOMPILE_ABI,
                functionName: 'delegate',
                args: [params.validatorAddress],
                value: parseEther(params.amount),
                chain: this.walletProvider.getCurrentChain().chain,
                account: walletClient.account,
            });

            return {
                hash: result,
                from: walletClient.account.address, // Now guaranteed to be defined
                to: params.validatorAddress,
                value: parseEther(params.amount),
            };

        } catch (error) {
            throw new Error(`Staking delegation failed: ${error.message}`);
        }
    }
}

const buildStakeDetails = async (
    state: State,
    runtime: IAgentRuntime,
    _wp: WalletProvider
): Promise<StakeParams> => {
    const context = composeContext({
        state,
        template: stakeTemplate,
    });

    const stakeDetails = (await generateObjectDeprecated({
        runtime,
        context,
        modelClass: ModelClass.SMALL,
    })) as StakeParams;

    return stakeDetails;
};

export const stakeAction: Action = {
    name: "stake",
    description: "Stakes tokens on a SEI validator.",
    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        state: State,
        _options: Record<string, unknown>, // Replace `any` with a safer type
        callback?: HandlerCallback
    ) => {
        
        // Create a new variable to avoid reassigning the parameter
        let updatedState = state;
        
        if (!updatedState) {
            updatedState = (await runtime.composeState(message)) as State;
        } else {
            updatedState = await runtime.updateRecentMessageState(updatedState);
        }

        elizaLogger.debug("Stake action handler called");
        const walletProvider = await initWalletProvider(runtime);
        const action = new StakeAction(walletProvider);

        // Compose stake context
        const paramOptions = await buildStakeDetails(
            updatedState, // Use the new variable
            runtime,
            walletProvider
        );

        try {
            const stakeResp = await action.stake(paramOptions);
            if (callback) {
                callback({
                    text: `Successfully staked ${paramOptions.amount} tokens to ${paramOptions.validatorAddress}\nTransaction Hash: ${stakeResp.hash}`,
                    content: {
                        success: true,
                        hash: stakeResp.hash,
                        amount: formatEther(stakeResp.value),
                        validatorAddr: stakeResp.to,
                        chain: walletProvider.getCurrentChain().name,
                    },
                });
            }
            return true;
        } catch (error) {
            elizaLogger.error("Error during staking:", error);
            if (callback) {
                callback({
                    text: `Error staking SEI: ${error.message}`,
                    content: { error: error.message },
                });
            }
            return false;
        }
    },
    validate: async (runtime: IAgentRuntime) => {
        const privateKey = runtime.getSetting("SEI_PRIVATE_KEY");
        return typeof privateKey === "string" && privateKey.startsWith("0x");
    },
    examples: [
        [
            {
                user: "user",
                content: {
                    text: "Stake 1 SEI on seivaloper1ummny4p645xraxc4m7nphf7vxawfzt3p5hn47t",
                    action: "STAKE_TOKENS",
                },
            },
            {
                user: "assistant",
                content: {
                    text: "I'll stake 1 SEI on seivaloper1ummny4p645xraxc4m7nphf7vxawfzt3p5hn47t",
                    action: "STAKE_TOKENS",
                },
            },
        ],
    ],
    similes: ["STAKE_TOKENS", "DELEGATE_TOKENS", "STAKE_FUNDS", "STAKE_SEI", "DELEGATE_SEI"],
};
