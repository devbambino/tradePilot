import { IAgentRuntime, settings } from "@elizaos/core";
import { ParsedKeypair, decodeRoochSercetKey } from "@roochnetwork/rooch-sdk/dist/esm";

const ROOCH_SECRET_KEY_PREFIX = "roochsecretkey"

const parseKeypair = (runtime: IAgentRuntime): ParsedKeypair => {
    const privateKey = runtime.getSetting("ROOCH_PRIVATE_KEY");
    if (!privateKey) {
        throw new Error("ROOCH_PRIVATE_KEY is not set");
    }

    if (!privateKey.startsWith(ROOCH_SECRET_KEY_PREFIX)) {
        throw new Error("ROOCH_PRIVATE_KEY is invalid");
    }

    return decodeRoochSercetKey(privateKey);
};

const parseKeypairFromSettings = (): ParsedKeypair => {
    const privateKey = settings["ROOCH_PRIVATE_KEY"];
    if (!privateKey) {
        throw new Error("ROOCH_PRIVATE_KEY is not set");
    }

    if (!privateKey.startsWith(ROOCH_SECRET_KEY_PREFIX)) {
        throw new Error("ROOCH_PRIVATE_KEY is invalid");
    }

    return decodeRoochSercetKey(privateKey);
};

const parseAccessPath = (uri: string): string => {
    // Adjust the regex to ensure correct matching
    const match = uri.match(/^rooch:\/\/object\/(0x[a-fA-F0-9]+)$/);
    if (match) {
        return `/object/${match[1]}`;
    }
    throw new Error("Invalid URI format");
};

export { parseKeypair, parseKeypairFromSettings, parseAccessPath };