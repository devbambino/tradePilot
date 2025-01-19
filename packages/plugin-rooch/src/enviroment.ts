import { IAgentRuntime } from "@elizaos/core";
import { z } from "zod";

export const roochEnvSchema = z.object({
    ROOCH_PRIVATE_KEY: z.string().min(1, "Rooch private key is required"),
    ROOCH_NETWORK: z.enum(["mainnet", "testnet"]),
});

export type RoochConfig = z.infer<typeof roochEnvSchema>;

export async function validateRoochConfig(
    runtime: IAgentRuntime
): Promise<RoochConfig> {
    try {
        const config = {
            ROOCH_PRIVATE_KEY:
                runtime.getSetting("ROOCH_PRIVATE_KEY") ||
                process.env.ROOCH_PRIVATE_KEY,
            ROOCH_NETWORK:
                runtime.getSetting("ROOCH_NETWORK") || process.env.ROOCH_NETWORK,
        };

        return roochEnvSchema.parse(config);
    } catch (error) {
        if (error instanceof z.ZodError) {
            const errorMessages = error.errors
                .map((err) => `${err.path.join(".")}: ${err.message}`)
                .join("\n");
            throw new Error(
                `Rooch configuration validation failed:\n${errorMessages}`
            );
        }
        throw error;
    }
}
