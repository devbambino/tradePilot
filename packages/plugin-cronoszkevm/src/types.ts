import { z } from "zod";
export interface TransferContent {
    tokenAddress: string;
    recipient: string;
    amount: string | number;
}

export const TransferSchema = z.object({
    tokenAddress: z.string().length(42).startsWith("0x"),
    recipient: z.string().length(42).startsWith("0x"),
    amount: z.union([z.string(), z.number()]),
});

export const isTransferContent = (object: any): object is TransferContent => {
    return TransferSchema.safeParse(object).success;
};
