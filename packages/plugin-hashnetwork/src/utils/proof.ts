import type { ClaimTunnelResponse } from "@reclaimprotocol/attestor-core/lib/proto/api";
import type { Address, Hex } from "viem";
import { WITNESS_NODE_URL } from "./constants";

export type Proof = {
    claimData: ClaimTunnelResponse["claim"];
    identifier: string;
    signatures: string[];
    extractedParameterValues: Record<string, string>;
    witnesses: {
        id: string;
        url: string;
    }[];
};

export type OnChainProof = {
    claimInfo: {
        context: string;
        parameters: string;
        provider: string;
    };
    signedClaim: {
        claim: {
            epoch: number;
            identifier: Hex;
            owner: Address;
            timestampS: number;
        };
        signatures: Hex[];
    };
};

export function transformProof(proof: ClaimTunnelResponse): Proof {
    if (!proof || !proof.claim || !proof.signatures) {
        throw new Error("Invalid proof object");
    }
    return {
        claimData: proof.claim,
        identifier: proof.claim.identifier,
        signatures: [
            `0x${Buffer.from(proof.signatures.claimSignature).toString("hex")}`,
        ],
        extractedParameterValues: proof.claim.context
            ? JSON.parse(proof.claim.context).extractedParameters
            : "",
        witnesses: [
            {
                id: proof.signatures.attestorAddress,
                url: WITNESS_NODE_URL,
            },
        ],
    };
}

export function transformForOnchain(proof: Proof): OnChainProof {
    return {
        claimInfo: {
            context: proof.claimData.context,
            parameters: proof.claimData.parameters,
            provider: proof.claimData.provider,
        },
        signedClaim: {
            claim: {
                epoch: proof.claimData.epoch,
                identifier: proof.claimData.identifier as Hex,
                owner: proof.claimData.owner as Address,
                timestampS: proof.claimData.timestampS,
            },
            signatures: proof.signatures as Hex[],
        },
    };
}
