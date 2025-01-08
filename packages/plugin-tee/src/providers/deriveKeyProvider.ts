import { IAgentRuntime, Memory, Provider, State } from "@elizaos/core";
import { Keypair } from "@solana/web3.js";
import crypto from "crypto";
import { DeriveKeyResponse, TappdClient } from "@phala/dstack-sdk";
import { privateKeyToAccount } from "viem/accounts";
import { PrivateKeyAccount, keccak256 } from "viem";
import { RemoteAttestationProvider } from "./remoteAttestationProvider";
import { TEEMode, RemoteAttestationQuote } from "../types/tee";
import *  as starknet from "starknet";

interface DeriveKeyAttestationData {
    agentId: string;
    publicKey: string;
}

class DeriveKeyProvider {
    private client: TappdClient;
    private raProvider: RemoteAttestationProvider;

    constructor(teeMode?: string) {
        let endpoint: string | undefined;

        // Both LOCAL and DOCKER modes use the simulator, just with different endpoints
        switch (teeMode) {
            case TEEMode.LOCAL:
                endpoint = "http://localhost:8090";
                console.log(
                    "TEE: Connecting to local simulator at localhost:8090"
                );
                break;
            case TEEMode.DOCKER:
                endpoint = "http://host.docker.internal:8090";
                console.log(
                    "TEE: Connecting to simulator via Docker at host.docker.internal:8090"
                );
                break;
            case TEEMode.PRODUCTION:
                endpoint = undefined;
                console.log(
                    "TEE: Running in production mode without simulator"
                );
                break;
            default:
                throw new Error(
                    `Invalid TEE_MODE: ${teeMode}. Must be one of: LOCAL, DOCKER, PRODUCTION`
                );
        }

        this.client = endpoint ? new TappdClient(endpoint) : new TappdClient();
        this.raProvider = new RemoteAttestationProvider(teeMode);
    }

    private async generateDeriveKeyAttestation(
        agentId: string,
        publicKey: string
    ): Promise<RemoteAttestationQuote> {
        const deriveKeyData: DeriveKeyAttestationData = {
            agentId,
            publicKey,
        };
        const reportdata = JSON.stringify(deriveKeyData);
        console.log("Generating Remote Attestation Quote for Derive Key...");
        const quote = await this.raProvider.generateAttestation(reportdata);
        console.log("Remote Attestation Quote generated successfully!");
        return quote;
    }

    async rawDeriveKey(
        path: string,
        subject: string
    ): Promise<DeriveKeyResponse> {
        try {
            if (!path || !subject) {
                console.error(
                    "Path and Subject are required for key derivation"
                );
            }

            console.log("Deriving Raw Key in TEE...");
            const derivedKey = await this.client.deriveKey(path, subject);

            console.log("Raw Key Derived Successfully!");
            return derivedKey;
        } catch (error) {
            console.error("Error deriving raw key:", error);
            throw error;
        }
    }

    async deriveEd25519Keypair(
        path: string,
        subject: string,
        agentId: string
    ): Promise<{ keypair: Keypair; attestation: RemoteAttestationQuote }> {
        try {
            if (!path || !subject) {
                console.error(
                    "Path and Subject are required for key derivation"
                );
            }

            console.log("Deriving Key in TEE...");
            const derivedKey = await this.client.deriveKey(path, subject);
            const uint8ArrayDerivedKey = derivedKey.asUint8Array();

            const hash = crypto.createHash("sha256");
            hash.update(uint8ArrayDerivedKey);
            const seed = hash.digest();
            const seedArray = new Uint8Array(seed);
            const keypair = Keypair.fromSeed(seedArray.slice(0, 32));

            // Generate an attestation for the derived key data for public to verify
            const attestation = await this.generateDeriveKeyAttestation(
                agentId,
                keypair.publicKey.toBase58()
            );
            console.log("Key Derived Successfully!");

            return { keypair, attestation };
        } catch (error) {
            console.error("Error deriving key:", error);
            throw error;
        }
    }

    async deriveEcdsaKeypair(
        path: string,
        subject: string,
        agentId: string
    ): Promise<{
        keypair: PrivateKeyAccount;
        attestation: RemoteAttestationQuote;
    }> {
        try {
            if (!path || !subject) {
                console.error(
                    "Path and Subject are required for key derivation"
                );
            }

            console.log("Deriving ECDSA Key in TEE...");
            const deriveKeyResponse: DeriveKeyResponse =
                await this.client.deriveKey(path, subject);
            const hex = keccak256(deriveKeyResponse.asUint8Array());
            const keypair: PrivateKeyAccount = privateKeyToAccount(hex);

            // Generate an attestation for the derived key data for public to verify
            const attestation = await this.generateDeriveKeyAttestation(
                agentId,
                keypair.address
            );
            console.log("ECDSA Key Derived Successfully!");

            return { keypair, attestation };
        } catch (error) {
            console.error("Error deriving ecdsa key:", error);
            throw error;
        }
    }

    async deriveSnKeypair(
        path: string,
        subject: string,
        agentId: string
    ) : Promise<{
        keypair: {privateKey: string, publicKey: string};
        attestation: RemoteAttestationQuote;
    }> {
        try {
            if (!path || !subject) {
                console.error(
                    "Path and Subject are required for key derivation"
                );
            }
            console.log("Deriving Starknet Key in TEE...");
            const derivedKey = await this.client.deriveKey(path, subject);
            const uint8Parsed = derivedKey.asUint8Array();
            const stringParsed = uint8Parsed.toString();
            
            const privateKey = starknet.starknetKeccak(stringParsed).toString();
            const publicKey = starknet.ec.starkCurve.getStarkKey(privateKey);

            const argentXaccountClassHash = '0x1a736d6ed154502257f02b1ccdf4d9d1089f80811cd6acad48e6b6a9d1f2003';
            const AXConstructorCallData = starknet.CallData.compile({
                owner: publicKey,
                guardian: '0',
              });
            const AXcontractAddress = starknet.hash.calculateContractAddressFromHash(
                publicKey,
                argentXaccountClassHash,
                AXConstructorCallData,
                0
            );
            const attestation = await this.generateDeriveKeyAttestation(
                agentId,
                AXcontractAddress    
            );
            return { keypair: {privateKey: privateKey, publicKey: publicKey} , attestation: attestation}
        } catch (error) {
            console.error("Error deriving Starknet key:", error);
            throw error;
        }
    }
}

const deriveKeyProvider: Provider = {
    get: async (runtime: IAgentRuntime, _message?: Memory, _state?: State) => {
        const teeMode = runtime.getSetting("TEE_MODE");
        const provider = new DeriveKeyProvider(teeMode);
        const agentId = runtime.agentId;
        try {
            // Validate wallet configuration
            if (!runtime.getSetting("WALLET_SECRET_SALT")) {
                console.error(
                    "Wallet secret salt is not configured in settings"
                );
                return "";
            }

            try {
                const secretSalt =
                    runtime.getSetting("WALLET_SECRET_SALT") || "secret_salt";
                const solanaKeypair = await provider.deriveEd25519Keypair(
                    "/",
                    secretSalt,
                    agentId
                );
                const evmKeypair = await provider.deriveEcdsaKeypair(
                    "/",
                    secretSalt,
                    agentId
                );
                const snKeypair = await provider.deriveSnKeypair(
                    "/",
                    secretSalt,
                    agentId
                );

                return JSON.stringify({
                    solana: solanaKeypair.keypair.publicKey,
                    evm: evmKeypair.keypair.address,
                    sn: snKeypair.keypair.publicKey
                });
            } catch (error) {
                console.error("Error creating PublicKey:", error);
                return "";
            }
        } catch (error) {
            console.error("Error in derive key provider:", error.message);
            return `Failed to fetch derive key information: ${error instanceof Error ? error.message : "Unknown error"}`;
        }
    },
};

export { deriveKeyProvider, DeriveKeyProvider };
