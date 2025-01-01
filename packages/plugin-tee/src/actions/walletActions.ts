import { Action, IAgentRuntime } from "@ai16z/eliza";
import { DeriveKeyProvider } from "../providers/deriveKeyProvider";
import { TEEMode } from "../types/tee";
import { Account } from "starknet";
import { hash } from "starknet";

export const generateWalletAction: Action = {
    name: "generate_wallet",
    description: "Generate a new secure wallet using TEE",
    parameters: {
        type: "object",
        properties: {
            walletType: {
                type: "string",
                enum: ["ethereum", "starknet", "solana"],
                description: "Type of wallet to generate"
            },
            label: {
                type: "string",
                description: "Label for the generated wallet"
            }
        },
        required: ["walletType", "label"]
    },
    similes: [
        "create a new {walletType} wallet labeled {label}",
        "generate a {walletType} wallet labeled {label}",
        "make me a {walletType} wallet called {label}",
        "setup a {walletType} wallet with label {label}"
    ],
    examples: [
        [{
            user: "generate an ethereum wallet labeled 'my-eth-wallet'",
            content: {
                text: "generate an ethereum wallet labeled 'my-eth-wallet'",
                action: "generate_wallet",
                parameters: {
                    walletType: "ethereum",
                    label: "my-eth-wallet"
                },
                source: "user"
            }
        }],
        [{
            user: "create a starknet wallet labeled 'my-stark-wallet'",
            content: {
                text: "create a starknet wallet labeled 'my-stark-wallet'",
                action: "generate_wallet",
                parameters: {
                    walletType: "starknet",
                    label: "my-stark-wallet"
                },
                source: "user"
            }
        }]
    ],
    validate: async (runtime: IAgentRuntime, params: any) => {
        console.log("Validating parameters:", params);
        if (!params.walletType) {
            return { isValid: false, error: "Wallet type is required" };
        }
        if (!params.label) {
            return { isValid: false, error: "Label is required" };
        }
        if (!["ethereum", "starknet", "solana"].includes(params.walletType?.toLowerCase())) {
            return { isValid: false, error: "Invalid wallet type. Must be one of: ethereum, starknet, solana" };
        }
        return { isValid: true };
    },
    handler: async (runtime: IAgentRuntime, params: any) => {
        try {
            console.log("Handler received params:", JSON.stringify(params, null, 2));
            
            // Extract wallet type from text if not in params
            let walletType = params.walletType;
            let label = params.label;

            if (!walletType || !label) {
                console.log("Attempting to extract from text");
                // Try to get text from various possible locations
                const text = params.text?.toLowerCase() || 
                           params.content?.text?.toLowerCase() || 
                           params.message?.text?.toLowerCase() ||
                           params.event?.text?.toLowerCase() || "";
                           
                console.log("Text to extract from:", text);
                
                // Try to extract wallet type from text
                if (text.includes("ethereum")) walletType = "ethereum";
                else if (text.includes("starknet")) walletType = "starknet";
                else if (text.includes("solana")) walletType = "solana";

                console.log("Extracted wallet type:", walletType);

                // Try to extract label from text with different quote styles
                const labelMatches = [
                    text.match(/labeled ["'](.+?)["']/),
                    text.match(/labeled (.+?)( |$)/),
                    text.match(/called ["'](.+?)["']/),
                    text.match(/called (.+?)( |$)/),
                ];

                for (const match of labelMatches) {
                    if (match) {
                        label = match[1];
                        break;
                    }
                }
                
                console.log("Extracted label:", label);
            }

            if (!walletType) {
                throw new Error("Could not determine wallet type. Please specify ethereum, starknet, or solana.");
            }

            if (!label) {
                throw new Error("Please provide a label for your wallet using the format: labeled 'your-label-here'");
            }

            const teeMode = runtime.getSetting("TEE_MODE") || TEEMode.OFF;
            const walletSalt = runtime.getSetting("WALLET_SECRET_SALT");
            
            if (!walletSalt) {
                throw new Error("WALLET_SECRET_SALT not configured in settings");
            }

            const deriveKeyProvider = new DeriveKeyProvider(teeMode);
            const path = `/wallets/${label}`;

            let keypair;
            let attestation;

            switch(walletType.toLowerCase()) {
                case "ethereum": {
                    // Generate Ethereum wallet
                    const result = await deriveKeyProvider.deriveEcdsaKeypair(
                        path,
                        walletSalt,
                        runtime.agentId
                    );
                    keypair = result.keypair;
                    attestation = result.attestation;

                    return {
                        success: true,
                        message: "Ethereum wallet generated successfully",
                        data: {
                            address: keypair.address,
                            attestation: {
                                quote: attestation.quote,
                                timestamp: attestation.timestamp,
                                publicKey: keypair.address,
                                path: path
                            }
                        }
                    };
                }
                
                case "starknet": {
                    // For StarkNet, we'll derive a private key and create an Account
                    const rawKey = await deriveKeyProvider.rawDeriveKey(
                        path,
                        walletSalt
                    );
                    
                    // Convert raw key bytes to a decimal string for StarkNet
                    const keyBytes = rawKey.asUint8Array();
                    const keyBigInt = BigInt('0x' + Buffer.from(keyBytes).toString('hex'));
                    const keyDecimal = keyBigInt.toString(10);
                    
                    // Convert to StarkNet private key format
                    const privateKey = hash.computePedersenHash([keyDecimal]);
                    
                    // Create StarkNet account (this is a simplified version)
                    const account = new Account(
                        runtime.getSetting("STARKNET_PROVIDER") || "testnet",
                        privateKey
                    );

                    // Get attestation for the derived key
                    const attestation = await deriveKeyProvider.generateDeriveKeyAttestation(
                        runtime.agentId,
                        account.address
                    );
                    
                    return {
                        success: true,
                        message: "StarkNet wallet generated successfully",
                        data: {
                            address: account.address,
                            attestation: {
                                quote: attestation.quote,
                                timestamp: attestation.timestamp,
                                publicKey: account.address,
                                path: path
                            }
                        }
                    };
                }

                case "solana": {
                    // Generate Solana wallet
                    const result = await deriveKeyProvider.deriveEd25519Keypair(
                        path,
                        walletSalt,
                        runtime.agentId
                    );
                    keypair = result.keypair;
                    attestation = result.attestation;

                    return {
                        success: true,
                        message: "Solana wallet generated successfully",
                        data: {
                            address: keypair.publicKey.toBase58(),
                            attestation: {
                                quote: attestation.quote,
                                timestamp: attestation.timestamp,
                                publicKey: keypair.publicKey.toBase58(),
                                path: path
                            }
                        }
                    };
                }

                default:
                    throw new Error(`Unsupported wallet type: ${walletType}`);
            }
        } catch (error) {
            console.error("Wallet generation error:", error);
            return {
                success: false,
                message: `Failed to generate wallet: ${error.message}`,
                error: {
                    message: error.message,
                    stack: error.stack
                }
            };
        }
    }
};
