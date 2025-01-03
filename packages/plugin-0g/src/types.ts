import { z } from "zod";

export const UploadSchema = z.object({
    filePath: z.string(),
});

export interface UploadContent {
    filePath: string;
}

export const isUploadContent = (object: any): object is UploadContent => {
    if (UploadSchema.safeParse(object).success) {
        return true;
    }
    console.error("Invalid content: ", object);
    return false;
};
