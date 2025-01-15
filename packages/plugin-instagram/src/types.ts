// src/types.ts
import { z } from "zod";

export interface InstagramContent {
    imageUrl: string;
    caption: string;
}

export const InstagramPostSchema = z.object({
    imageUrl: z.string().url().describe("The URL of the image to post"),
    caption: z.string().max(2200).describe("The caption for the Instagram post")
});

export const isInstagramPostContent = (obj: any): obj is InstagramContent => {
    return InstagramPostSchema.safeParse(obj).success;
};