import { z } from "zod";
export interface TransferContent {
    recipient: string;
    amount: string | number;
    tokenAddress?: string; // Optional for native NEAR transfers
}

export const TransferContentSchema = z.object({
    recipient: z.string(),
    amount: z.union([z.string(), z.number()]),
    tokenAddress: z.string().optional(),
});

export const isTransferContent = (object: any): object is TransferContent => {
    return TransferContentSchema.safeParse(object).success;
};

export interface SwapContent {
    inputTokenId: string;
    outputTokenId: string;
    amount: string | number;
}

export const SwapContentSchema = z.object({
    inputTokenId: z.string(),
    outputTokenId: z.string(),
    amount: z.union([z.string(), z.number()]),
});

export const isSwapContent = (object: any): object is SwapContent => {
    return SwapContentSchema.safeParse(object).success;
};
