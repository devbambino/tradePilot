import { z } from "zod";

export const TransferSchema = z.object({
    recipient: z.string(),
    amount: z.union([z.string(), z.number()]),
});

export interface TransferContent {
    recipient: string;
    amount: string | number;
}

export const isTransferContent = (object: any): object is TransferContent => {
    if (TransferSchema.safeParse(object).success) {
        return true;
    }
    console.error("Invalid content: ", object);
    return false;
};
