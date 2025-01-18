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

import { SuiClient, getFullnodeUrl } from "@mysten/sui/client";
import { SuinsClient } from "@mysten/suins";

import { walletProvider } from "../providers/wallet";
import { SuiNetwork } from "../types";

export interface NameToAddressContent extends Content {
    recipientName: string;
}

function isNameToAddressContent(
    content: Content
): content is NameToAddressContent {
    console.log("Content for show address", content);
    return typeof content.recipientName === "string";
}

const nameToAddressTemplate = `Extract the SUI domain name from the recent messages and return it in a JSON format.

Example input: "Convert adeniyi.sui to address" or "What's the address for adeniyi.sui"
Example output:
\`\`\`json
{
    "recipientName": "adeniyi.sui"
}
\`\`\`

{{recentMessages}}

Extract the SUI domain name (ending in .sui) that needs to be converted to an address.
If no valid .sui domain is found, return null.`;

export default {
    name: "CONVERT_NAME_TO_ADDRESS",
    similes: [
        "CONVERT_SUI_NAME_TO_ADDRESS",
        "CONVERT_DOMAIN_TO_ADDRESS",
        "SHOW_ADDRESS_BY_NAME",
        "SHOW_ADDRESS_BY_DOMAIN",
    ],
    validate: async (runtime: IAgentRuntime, message: Memory) => {
        console.log(
            "Validating sui name to address from user:",
            message.userId
        );
        //add custom validate logic here
        /*
            const adminIds = runtime.getSetting("ADMIN_USER_IDS")?.split(",") || [];
            //console.log("Admin IDs from settings:", adminIds);

            const isAdmin = adminIds.includes(message.userId);

            if (isAdmin) {
                //console.log(`Authorized transfer from user: ${message.userId}`);
                return true;
            }
            else
            {
                //console.log(`Unauthorized transfer attempt from user: ${message.userId}`);
                return false;
            }
            */
        return true;
    },
    description: "Convert a name service domain to an sui address",
    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        state: State,
        _options: { [key: string]: unknown },
        callback?: HandlerCallback
    ): Promise<boolean> => {
        elizaLogger.log("Starting CONVERT_NAME_TO_ADDRESS handler...");
        const walletInfo = await walletProvider.get(runtime, message, state);
        state.walletInfo = walletInfo;

        // Initialize or update state
        if (!state) {
            state = (await runtime.composeState(message)) as State;
        } else {
            state = await runtime.updateRecentMessageState(state);
        }

        // Define the schema for the expected output
        const nameToAddressSchema = z.object({
            recipientName: z.string(),
        });

        // Compose transfer context
        const nameToAddressContext = composeContext({
            state,
            template: nameToAddressTemplate,
        });

        // Generate transfer content with the schema
        const content = await generateObject({
            runtime,
            context: nameToAddressContext,
            schema: nameToAddressSchema,
            modelClass: ModelClass.SMALL,
        });

        const nameToAddressContent = content.object as NameToAddressContent;

        // Validate transfer content
        if (!isNameToAddressContent(nameToAddressContent)) {
            console.error(
                "Invalid content for CONVERT_NAME_TO_ADDRESS action."
            );
            if (callback) {
                callback({
                    text: "Unable to process name to address request. Invalid content provided.",
                    content: { error: "Invalid name to address content" },
                });
            }
            return false;
        }

        try {
            const network = runtime.getSetting("SUI_NETWORK");
            const suiClient = new SuiClient({
                url: getFullnodeUrl(network as SuiNetwork),
            });
            const suinsClient = new SuinsClient({
                client: suiClient,
                network: network as Exclude<SuiNetwork, "devnet" | "localnet">,
            });

            console.log(
                "Getting address for name:",
                nameToAddressContent.recipientName
            );

            const address = await suinsClient.getNameRecord(
                nameToAddressContent.recipientName
            );
            console.log("Address:", address);

            if (callback) {
                callback({
                    text: `Successfully convert ${nameToAddressContent.recipientName} to ${address.targetAddress}`,
                    content: {
                        success: true,
                        address: address.targetAddress,
                    },
                });
            }

            return true;
        } catch (error) {
            console.error("Error during name to address conversion:", error);
            if (callback) {
                callback({
                    text: "An error occurred during name to address conversion.",
                    content: { error: "ConversionError" },
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
                    text: "Convert adeniyi.sui to address",
                },
            },
            {
                user: "{{user2}}",
                content: {
                    text: "Converting adeniyi.sui to address...",
                    action: "CONVERT_NAME_TO_ADDRESS",
                },
            },
            {
                user: "{{user2}}",
                content: {
                    text: "Successfully convert adeniyi.sui to 0x1eb7c57e3f2bd0fc6cb9dcffd143ea957e4d98f805c358733f76dee0667fe0b1",
                },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: {
                    text: "Convert @adeniyi to address",
                },
            },
            {
                user: "{{user2}}",
                content: {
                    text: "Convert @adeniyi to address",
                    action: "CONVERT_NAME_TO_ADDRESS",
                },
            },
            {
                user: "{{user2}}",
                content: {
                    text: "Successfully convert @adeniyi to 0x1eb7c57e3f2bd0fc6cb9dcffd143ea957e4d98f805c358733f76dee0667fe0b1",
                },
            },
        ],
    ] as ActionExample[][],
} as Action;
