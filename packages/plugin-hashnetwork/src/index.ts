import {
    type IVerifiableInferenceAdapter,
    type VerifiableInferenceOptions,
    type VerifiableInferenceResult,
    elizaLogger,
    ModelProviderName,
    models,
    VerifiableInferenceProvider,
} from "@elizaos/core";
import { createClaimOnAttestor } from "@reclaimprotocol/attestor-core";
import { verifyProof } from "@reclaimprotocol/js-sdk";
import type { Account, Address, Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { addProofOnChain } from "./contract";
import { WITNESS_NODE_URL } from "./utils/constants";
import { transformForOnchain, transformProof } from "./utils/proof";

interface HashNetworkOptions {
    privateKey: string;
    token: string;
    contractAddress: string;
    modelProvider?: ModelProviderName;
}

export class HashNetworkAdapter implements IVerifiableInferenceAdapter {
    public options: HashNetworkOptions;

    private _account: Account;

    constructor(options: HashNetworkOptions) {
        this.options = options;
        this._account = privateKeyToAccount(options.privateKey as Hex);
    }

    async generateText(
        context: string,
        modelClass: string,
        options?: VerifiableInferenceOptions
    ): Promise<VerifiableInferenceResult> {
        const provider = this.options.modelProvider || ModelProviderName.OPENAI;
        const baseEndpoint = options?.endpoint || models[provider].endpoint;
        const model = models[provider].model[modelClass];
        const apiKey = this.options.token;

        if (!apiKey) {
            throw new Error(
                `API key (token) is required for provider: ${provider}`
            );
        }

        // Get provider-specific endpoint, auth header and response json path
        let endpoint: string;
        let authHeader: string;

        switch (provider) {
            case ModelProviderName.OPENAI:
                endpoint = `${baseEndpoint}/chat/completions`;
                authHeader = `Bearer ${apiKey}`;
                break;
            default:
                throw new Error(`Unsupported model provider: ${provider}`);
        }

        try {
            const claim = await createClaimOnAttestor({
                name: "http",
                ownerPrivateKey: this.options.privateKey,
                params: {
                    url: endpoint,
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        model: model.name,
                        messages: [{ role: "user", content: "{{prompt}}" }],
                        temperature:
                            options?.providerOptions?.temperature ||
                            models[provider].model[modelClass].temperature,
                    }),
                    paramValues: {
                        // prompt will be replaced with the actual prompt so add escaped characters
                        prompt: JSON.stringify(context).slice(1, -1),
                    },
                    responseMatches: [
                        {
                            type: "regex",
                            value: '"content":\\s*"(?<response>(?:[^"\\\\]|\\\\.)*?)"',
                        },
                    ],
                },
                secretParams: {
                    headers: {
                        authorization: authHeader,
                    },
                },
                maxZkChunks: 500,
                logger: elizaLogger,
                client: {
                    url: WITNESS_NODE_URL,
                },
            });
            const proof = transformProof(claim);
            elizaLogger.info("Proof created", { proof });

            const txHash = await addProofOnChain({
                proof: transformForOnchain(proof),
                contractAddress: this.options.contractAddress as Address,
                account: this._account,
            });
            elizaLogger.info(`Proof added on Hash Network 🔥: ${txHash}`);
            let { response } = proof.extractedParameterValues;
            // Fix the escape characters
            response = response.replace(/\\"/g, '"');

            return {
                text: response,
                proof,
                provider: VerifiableInferenceProvider.HASH_NETWORK,
                timestamp: Date.now(),
            };
        } catch (error) {
            console.error("Error in HashNetwork generateText:", error);
            throw error;
        }
    }

    async verifyProof(result: VerifiableInferenceResult): Promise<boolean> {
        return verifyProof(result.proof);
    }
}

export default HashNetworkAdapter;
