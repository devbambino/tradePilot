import { IAgentRuntime } from "@elizaos/core";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import init, {
    update_constants,
    update_identifiers,
} from "./move_bytecode_template.js";
import { bcs } from "@mysten/bcs";
import { fileURLToPath } from "url";
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

interface TokenMetadata {
    name: string;
    symbol: string;
    description: string;
    imageUrl: string;
}

let wasmInitialized = false;

export async function updateTokenBytecode(
    bytecode: Uint8Array,
    metadata: TokenMetadata
): Promise<Uint8Array> {
    if (!wasmInitialized) {
        try {
            const fs = await import("fs");
            const path = await import("path");

            const currentDir = path.dirname(fileURLToPath(import.meta.url));
            const wasmPath = path.resolve(
                currentDir,
                "../../../node_modules/@mysten/move-bytecode-template/move_bytecode_template_bg.wasm"
            );

            const wasmBuffer = fs.readFileSync(wasmPath);
            await init(wasmBuffer);
            wasmInitialized = true;
        } catch (error) {
            throw new Error(
                `Failed to initialize WASM module: ${error.message}`
            );
        }
    }

    // Update identifiers
    let updated = update_identifiers(bytecode, {
        TEMPLATE_COIN: metadata.symbol.toUpperCase(),
        template_coin: metadata.symbol.toLowerCase(),
    });

    // Update constants
    updated = update_constants(
        updated,
        bcs.string().serialize(metadata.symbol).toBytes(),
        bcs.string().serialize("TMPL").toBytes(),
        "Vector(U8)"
    );

    updated = update_constants(
        updated,
        bcs.string().serialize(metadata.name).toBytes(),
        bcs.string().serialize("Template Coin").toBytes(),
        "Vector(U8)"
    );

    updated = update_constants(
        updated,
        bcs.string().serialize(metadata.description).toBytes(),
        bcs.string().serialize("Template Coin Description").toBytes(),
        "Vector(U8)"
    );

    updated = update_constants(
        updated,
        bcs.string().serialize(metadata.imageUrl).toBytes(),
        bcs
            .string()
            .serialize(
                "https://strapi-dev.scand.app/uploads/sui_c07df05f00.png"
            )
            .toBytes(),
        "Vector(U8)"
    );

    return updated;
}

export { parseAccount, TokenMetadata };
