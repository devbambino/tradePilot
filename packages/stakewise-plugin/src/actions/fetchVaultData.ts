import {
    elizaLogger,
    IAgentRuntime,
    Memory,
    State,
    Action,
    HandlerCallback,
} from "@ai16z/eliza";
import axios from "axios";

const API_URL = "https://graphs.stakewise.io/mainnet/subgraphs/name/stakewise/prod";
const VAULT_ADDRESS = "0xac0f906e433d58fa868f936e8a43230473652885";

export const fetchDataFromAPI = async (query: string): Promise<any> => {
    try {
        const response = await axios.post(API_URL, { query }, {
            headers: { "Content-Type": "application/json" },
        });
        return response.data;
    } catch (error: any) {
        elizaLogger.error("API request failed", {
            message: error.message,
            response: error.response ? error.response.data : "No response data",
        });
        throw new Error("Failed to fetch data from the API.");
    }
};

const getApyQuery = (): string => `
    query {
        vaults(where: { addressString: "${VAULT_ADDRESS}" }) {
            apy
        }
    }`;

const getTvlQuery = (): string => `
    query {
        vault(id: "${VAULT_ADDRESS}") {
            totalAssets
        }
    }`;

const formatApy = (apy: string): string => `${parseFloat(apy).toFixed(2)}%`;

const formatTvl = (totalAssets: string): string =>
    (parseFloat(totalAssets) / 1e18).toLocaleString(undefined, {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    });

export const fetchVaultData: Action = {
    name: "FETCH_VAULT_DATA",
    similes: ["VAULT_INFO", "ETH_VAULT", "TVL_INFO"],
    description: "Fetch data from the vault API, including APY and TVL.",
    validate: async () => true, // Always trigger for simplicity
    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        state: State | undefined,
        options: { [key: string]: unknown } = {},
        callback: HandlerCallback = async () => []
    ): Promise<boolean> => {
        elizaLogger.log("Handling FETCH_VAULT_DATA action.");

        state = state || {
            bio: "",
            lore: "",
            messageDirections: "",
            postDirections: "",
            preDirections: "",
            tags: [],
            variables: {},
            roomId: "12345-67890-12345-67890-12345",
            actors: "",
            recentMessages: "",
            recentMessagesData: [],
        };

        const userQuestion = message.content?.text.toLowerCase() || "";
        const askForApy = userQuestion.includes("apy");
        const askForTvl = userQuestion.includes("tvl");

        try {
            let responseText = "";

            if (askForApy || (!askForTvl && !askForApy)) {
                elizaLogger.log("Fetching APY...");
                const apyData = await fetchDataFromAPI(getApyQuery());
                const apy = apyData.data.vaults[0]?.apy;
                if (!apy) throw new Error("APY data not found.");
                responseText += `vault apy is ${formatApy(apy)}. `;
            }

            if (askForTvl || (!askForTvl && !askForApy)) {
                elizaLogger.log("Fetching TVL...");
                const tvlData = await fetchDataFromAPI(getTvlQuery());
                const totalAssets = tvlData.data.vault?.totalAssets;
                if (!totalAssets) throw new Error("tvl data not found.");
                responseText += `tvl is ${formatTvl(totalAssets)} eth.`;
            }

            await callback({
                text: responseText.trim(),
                content: { success: true, data: {} },
            });
        } catch (error: any) {
            elizaLogger.error("Error processing FETCH_VAULT_DATA action", {
                message: error.message,
            });
            await callback({
                text: "Failed to fetch data. Please try again later.",
                content: { success: false, error: error.message },
            });
        }

        return true;
    },
    examples: [
        [
            { user: "{{user1}}", content: { text: "What's the APY for the vault?" } },
            {
                user: "{{agentName}}",
                content: { text: "vault apy is 2.37%.", action: "FETCH_VAULT_DATA" },
            },
        ],
        [
            { user: "{{user1}}", content: { text: "What's the TVL for the vault?" } },
            {
                user: "{{agentName}}",
                content: { text: "tvl is 66,500 eth.", action: "FETCH_VAULT_DATA" },
            },
        ],
    ],
};
