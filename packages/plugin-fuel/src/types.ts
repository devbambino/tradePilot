import { z } from "zod";

export interface TransferParams {
    toAddress: string;
    amount: string;
}

export const TransferParamsSchema = z.object({
    toAddress: z.string(),
    amount: z.string(),
});

export const isTransferParams = (object: any): object is TransferParams => {
    return TransferParamsSchema.safeParse(object).success;
};
