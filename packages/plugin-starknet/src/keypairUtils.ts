import { DeriveKeyProvider, TEEMode } from "@elizaos/plugin-tee";
import { IAgentRuntime } from "@elizaos/core";
import { ec } from "starknet";

export interface KeypairResult {
    keypair?: {privateKey?: string, publicKey?: string};
}

/**
 * Gets either a keypair or public key based on TEE mode and runtime settings
 * @param runtime The agent runtime
 * @param requirePrivateKey Whether to return a full keypair (true) or just public key (false)
 * @returns KeypairResult containing either keypair or public key
 */
export async function getWalletKey(
    runtime: IAgentRuntime,
    requirePrivateKey: boolean = true
): Promise<KeypairResult> {
    const teeMode = runtime.getSetting("TEE_MODE") || TEEMode.OFF;

    if (teeMode !== TEEMode.OFF) {
        const walletSecretSalt = runtime.getSetting("WALLET_SECRET_SALT");
        if (!walletSecretSalt) {
            throw new Error(
                "WALLET_SECRET_SALT required when TEE_MODE is enabled"
            );
        }

        const deriveKeyProvider = new DeriveKeyProvider(teeMode);
        const deriveKeyResult = await deriveKeyProvider.deriveSnKeypair(
            "/",
            walletSecretSalt,
            runtime.agentId
        );

        return requirePrivateKey
            ? { keypair: {
                privateKey: deriveKeyResult.keypair.privateKey,
                publicKey: deriveKeyResult.keypair.publicKey
            } }
    }

    // TEE mode is OFF
    if (requirePrivateKey) {
        const privateKeyString =
            runtime.getSetting("STARKNET_PRIVATE_KEY") ??
            runtime.getSetting("WALLET_PRIVATE_KEY");

        if (!privateKeyString) {
            throw new Error("Private key not found in settings");
        }

        try {
            const publicKey = ec.starkCurve.getStarkKey(privateKeyString);
            return { keypair: {
                privateKey: privateKeyString,
                publicKey: publicKey,
            } };
        } catch (e) {
            console.log("Error generating keypair:", e);
        }
    } else {
        const publicKeyString =
            runtime.getSetting("STARKNET_PUBLIC_KEY") ??
            runtime.getSetting("WALLET_PUBLIC_KEY");

        if (!publicKeyString) {
            throw new Error("Public key not found in settings");
        }

        return { keypair: {
            publicKey: publicKeyString
        } };
    }
}
