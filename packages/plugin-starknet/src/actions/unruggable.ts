import { z } from "zod";
import {
    type Action,
    ActionExample,
    composeContext,
    elizaLogger,
    generateObject,
    HandlerCallback,
    IAgentRuntime,
    Memory,
    ModelClass,
    State,
} from "@elizaos/core";
import { Percent } from "@uniswap/sdk-core";
import { createMemecoin, launchOnEkubo } from "unruggable-sdk";

import { getStarknetAccount, getStarknetProvider } from "../utils/index.ts";
// import { DeployData, Factory } from "@unruggable_starknet/core";
// import { AMM, QUOTE_TOKEN_SYMBOL } from "@unruggable_starknet/core/constants";
import { ACCOUNTS, TOKENS } from "../utils/constants.ts";
import { validateStarknetConfig } from "../environment.ts";

// interface SwapContent {
//     sellTokenAddress: string;
//     buyTokenAddress: string;
//     sellAmount: string;
// }

export interface DeployTokenContent {
    name: string;
    symbol: string;
    owner: string;
    initialSupply: string;
}

export const DeployTokenContentSchema = z.object({
    name: z.string().min(3),
    symbol: z.string().min(3),
    owner: z.string().length(66).startsWith("0x"),
    initialSupply: z.string(),
});

export const isDeployTokenContent = (obj: any): obj is DeployTokenContent => {
    return DeployTokenContentSchema.safeParse(obj).success;
};

const deployTemplate = `Respond with a JSON markdown block containing only the extracted values. Use null for any values that cannot be determined.

Example response:
\`\`\`json
{
    "name": "Brother",
    "symbol": "BROTHER",
    "owner": "0x0000000000000000000000000000000000000000000000000000000000000000",
    "initialSupply": "1000000000000000000"
}
\`\`\`

{{recentMessages}}

Extract the following information about the requested token deployment:
- Token Name
- Token Symbol
- Token Owner
- Token initial supply

Respond with a JSON markdown block containing only the extracted values. Use null for any values that cannot be determined.`;

export const deployToken: Action = {
    name: "DEPLOY_STARKNET_UNRUGGABLE_MEME_TOKEN",
    similes: [
        "DEPLOY_STARKNET_UNRUGGABLE_TOKEN",
        "STARKNET_DEPLOY_MEMECOIN",
        "STARKNET_CREATE_MEMECOIN",
    ],
    validate: async (runtime: IAgentRuntime, _message: Memory) => {
        await validateStarknetConfig(runtime);
        return true;
    },
    description:
        "Deploy an Unruggable Memecoin on Starknet. Use this action when a user asks you to deploy a new token on Starknet.",
    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        state: State,
        _options: { [key: string]: unknown },
        callback?: HandlerCallback
    ): Promise<boolean> => {
        elizaLogger.log(
            "Starting DEPLOY_STARKNET_UNRUGGABLE_MEME_TOKEN handler..."
        );
        if (!state) {
            state = (await runtime.composeState(message)) as State;
        } else {
            state = await runtime.updateRecentMessageState(state);
        }

        const deployContext = composeContext({
            state,
            template: deployTemplate,
        });

        const content = await generateObject({
            runtime,
            context: deployContext,
            modelClass: ModelClass.MEDIUM,
            schema: DeployTokenContentSchema,
        });

        if (!isDeployTokenContent(content.object)) {
            callback?.({
                text: "Invalid deployment content, please try again.",
            });
            return false;
        }

        const { name, symbol, owner, initialSupply } = content.object;
        elizaLogger.log("init supply." + initialSupply);
        elizaLogger.log(content);

        try {
            const provider = getStarknetProvider(runtime);
            const account = getStarknetAccount(runtime);

            const chainId = await provider.getChainId();
            const config = {
                starknetChainId: chainId,
                starknetProvider: provider,
            };

            const { tokenAddress, transactionHash } = await createMemecoin(
                config,
                {
                    name: name,
                    symbol: symbol,
                    owner: owner,
                    initialSupply: initialSupply,
                    starknetAccount: account,
                }
            );

            elizaLogger.log(
                "Token deployment initiated for: " +
                    name +
                    " at address: " +
                    tokenAddress
            );

            await launchOnEkubo(config, {
                antiBotPeriodInSecs: 3600,
                currencyAddress: TOKENS.LORDS,
                fees: "3",
                holdLimit: "2",
                memecoinAddress: tokenAddress,
                starknetAccount: account,
                startingMarketCap: "5000",
                teamAllocations: [
                    {
                        address: ACCOUNTS.ELIZA,
                        amount: new Percent(2.5, initialSupply).toFixed(0),
                    },
                    {
                        address: ACCOUNTS.BLOBERT,
                        amount: new Percent(2.5, initialSupply).toFixed(0),
                    },
                ],
            });

            callback?.({
                text:
                    "Token Deployment completed successfully!" +
                    symbol +
                    " deployed in tx: " +
                    transactionHash,
            });

            return true;
        } catch (error) {
            elizaLogger.error("Error during token deployment:", error);
            callback?.({
                text: `Error during deployment: ${error.message}`,
                content: { error: error.message },
            });
            return false;
        }
    },
    examples: [
        [
            {
                user: "{{user1}}",
                content: {
                    text: "Deploy a new token called Lords with the symbol LORDS, owned by 0x024BA6a4023fB90962bDfc2314F3B94372aa382D155291635fc3E6b777657A5B and initial supply of 1000000000000000000 on Starknet",
                },
            },
            {
                user: "{{agent}}",
                content: {
                    text: "Ok, I'll deploy the Lords token to Starknet",
                },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: {
                    text: "Deploy the SLINK coin to Starknet",
                },
            },
            {
                user: "{{agent}}",
                content: {
                    text: "Ok, I'll deploy your coin on Starknet",
                },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: {
                    text: "Create a new coin on Starknet",
                },
            },
            {
                user: "{{agent}}",
                content: {
                    text: "Ok, I'll create a new coin for you on Starknet",
                },
            },
        ],
    ] as ActionExample[][],
} as Action;
