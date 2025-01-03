// It should just transfer subdomain from the root domain owned by the agent's wallet to the recipient.

import { z } from "zod";
import {
    ActionExample,
    HandlerCallback,
    IAgentRuntime,
    Memory,
    ModelClass,
    State,
    type Action,
    composeContext,
    generateObject,
    elizaLogger,
} from "@elizaos/core";
import { getStarknetAccount } from "../utils";
import { validateStarknetConfig } from "../environment";
import { getTransferSubdomainCall, isStarkDomain } from "../utils/starknetId";

export interface SubdomainCreationContent {
    recipient: string;
    subdomain: string;
}
export const SubdomainCreationSchema = z.object({
    recipient: z.string().length(66).startsWith("0x"),
    subdomain: z.string().refine((value) => {
        return isStarkDomain(value) && value.split(".").length === 3;
    }),
});

export const isSubdomainCreation = (
    obj: any
): obj is SubdomainCreationContent => {
    return SubdomainCreationSchema.safeParse(obj).success;
};

const transferTemplate = `Respond with a JSON markdown block containing only the extracted values. Use null for any values that cannot be determined.

Example response:
\`\`\`json
{
    "recipient": "0x1234567890ABCDEF1234567890ABCDEF1234567890ABCDEF1234567890ABCDEF",
    "subdomain": "subdomain.domain.stark",
}
\`\`\`

{{recentMessages}}

Given the recent messages, extract the following information about the requested subdomain creation:
- Subdomain to create
- Recipient wallet address


Respond with a JSON markdown block containing only the extracted values.`;

export default {
    name: "CREATE_SUBDOMAIN",
    similes: [
        "CREATE_SUBDOMAIN_ON_STARKNET",
        "SUBDOMAIN_ON_STARKNET",
        "SUBDOMAIN_CREATION",
        "SEND_SUBDOMAIN_ON_STARKNET",
    ],
    validate: async (runtime: IAgentRuntime, _message: Memory) => {
        await validateStarknetConfig(runtime);
        return true;
    },
    description:
        "MUST use this action if the user requests create a subdomain, the request might be varied, but it will always be a subdomain creation.",
    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        state: State,
        _options: { [key: string]: unknown },
        callback?: HandlerCallback
    ): Promise<boolean> => {
        elizaLogger.log("Starting CREATE_SUBDOMAIN handler...");

        // Initialize or update state
        if (!state) {
            state = (await runtime.composeState(message)) as State;
        } else {
            state = await runtime.updateRecentMessageState(state);
        }

        // Compose transfer context
        const transferContext = composeContext({
            state,
            template: transferTemplate,
        });

        // Generate transfer content
        const content = await generateObject({
            runtime,
            context: transferContext,
            modelClass: ModelClass.MEDIUM,
            schema: SubdomainCreationSchema,
        });

        elizaLogger.debug("Transfer content:", content);

        // Validate transfer content
        if (!isSubdomainCreation(content.object)) {
            elizaLogger.error("Invalid content for CREATE_SUBDOMAIN action.");
            if (callback) {
                callback({
                    text: "Not enough information to create subdomain. Please respond with your domain and the subdomain to create.",
                    content: { error: "Invalid subdomain creation content" },
                });
            }
            return false;
        }

        const { subdomain, recipient } =
            content.object as SubdomainCreationContent;
        try {
            const account = getStarknetAccount(runtime);

            const transferCall = getTransferSubdomainCall(
                account.address,
                subdomain,
                recipient
            );

            elizaLogger.success("Transferring", subdomain, "to", recipient);

            const tx = await account.execute(transferCall);

            elizaLogger.success(
                "Transfer completed successfully! tx: " + tx.transaction_hash
            );
            if (callback) {
                callback({
                    text:
                        "Transfer completed successfully! tx: " +
                        tx.transaction_hash,
                    content: {},
                });
            }

            return true;
        } catch (error) {
            elizaLogger.error("Error during subdomain transfer:", error);
            if (callback) {
                callback({
                    text: `Error transferring subdomain ${subdomain}: ${error.message}`,
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
                    text: "Send me subdomain.domain.stark to 0x0124aeb495b947201f5fac96fd1138e326ad86195b98df6dec9009158a533b49",
                },
            },
            {
                user: "{{agent}}",
                content: {
                    text: "I'll transfer subdomain.domain.stark to that address right away. Let me process that for you.",
                },
            },
        ],
    ] as ActionExample[][],
} as Action;
