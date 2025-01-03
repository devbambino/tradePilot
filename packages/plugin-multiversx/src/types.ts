import { z } from "zod";
export interface CreateTokenContent {
    tokenName: string;
    tokenTicker: string;
    decimals: string;
    amount: string;
}

export const CreateTokenContentSchema = z.object({
    tokenName: z.string(),
    tokenTicker: z.string(),
    decimals: z.string(),
    amount: z.string(),
});

export const isCreateTokenContent = (
    object: any
): object is CreateTokenContent => {
    return CreateTokenContentSchema.safeParse(object).success;
};

export interface TransferContent {
    tokenAddress: string;
    amount: string;
    tokenIdentifier?: string;
}

export const TransferContentSchema = z.object({
    tokenAddress: z.string(),
    amount: z.string(),
    tokenIdentifier: z.string().optional(),
});

export const isTransferContent = (object: any): object is TransferContent => {
    return TransferContentSchema.safeParse(object).success;
};
