import { IAgentRuntime } from "@elizaos/core";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { isValidSuiNSName, isValidSuiAddress } from "@mysten/sui/utils";
import type { SuiClient } from "@mysten/sui/client";

const parseAccount = (runtime: IAgentRuntime): Ed25519Keypair => {
    const privateKey = runtime.getSetting("SUI_PRIVATE_KEY");
    if (!privateKey) {
        throw new Error("SUI_PRIVATE_KEY is not set");
    } else if (privateKey.startsWith("suiprivkey")) {
        return Ed25519Keypair.fromSecretKey(privateKey);
    } else {
        return Ed25519Keypair.deriveKeypairFromSeed(privateKey);
    }
};

// to make sure the coin type is valid for swap
const isCoinType = (coinType: string): boolean => {
    if (
        coinType.includes("-") ||
        coinType === "" ||
        coinType === null ||
        coinType === undefined
    ) {
        return false;
    }
    return true;
};

async function getSuiAddress(
    value: string,
    suiClient: SuiClient
): Promise<string | null> {
    if (isValidSuiNSName(value)) {
        const address = await suiClient
            .resolveNameServiceAddress({
                name: value,
            })
            .then((address) => {
                console.log("Resolved address:", address);
                return address;
            })
            .catch((err) => {
                console.error("Error resolving address:", err);
                return null;
            });
        return address;
    } else if (isValidSuiAddress(value)) {
        return value;
    } else {
        return null;
    }
}

export { parseAccount, isCoinType, getSuiAddress };
