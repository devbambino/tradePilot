import { IAgentRuntime } from "@elizaos/core";
import { z } from "zod";

export const envSchema = z.object({
    CARDANO_PRIVATE_KEY: z.string().min(1, "Cardano mnemonic is required"),
    CARDANO_RPC_URL: z.string(),
    CARDANO_NETWORK: z.enum(["mainnet", "preprod", "preview"]),
    CARDANO_MAESTRO_APIKEY: z.string(),
});

export type EnvConfig = z.infer<typeof envSchema>;

export async function validateEnvConfig(
    runtime: IAgentRuntime
): Promise<EnvConfig> {
    try {
        const config = {
            CARDANO_PRIVATE_KEY:
                runtime.getSetting("CARDANO_PRIVATE_KEY") || process.env.CARDANO_PRIVATE_KEY,
            CARDANO_RPC_URL:
                runtime.getSetting("CARDANO_RPC_URL") || process.env.CARDANO_RPC_URL,
            CARDANO_NETWORK:
                runtime.getSetting("CARDANO_NETWORK") || process.env.CARDANO_NETWORK,
            CARDANO_MAESTRO_APIKEY:
                runtime.getSetting("CARDANO_MAESTRO_APIKEY") || process.env.CARDANO_MAESTRO_APIKEY
        };

        return envSchema.parse(config);
    } catch (error) {
        if (error instanceof z.ZodError) {
            const errorMessages = error.errors
                .map((err) => `${err.path.join(".")}: ${err.message}`)
                .join("\n");
            throw new Error(
                `Cardano configuration validation failed:\n${errorMessages}`
            );
        }
        throw error;
    }
}
