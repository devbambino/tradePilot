// src/actions/post.ts
import {
    Action,
    IAgentRuntime,
    Memory,
    State,
    HandlerCallback,
    composeContext,
    elizaLogger,
    ModelClass,
    generateObject
} from "@elizaos/core";
import axios, { AxiosError } from "axios";
import { instagramPostTemplate } from "../templates";
import { InstagramPostSchema, isInstagramPostContent } from "../types";

async function createMediaObject(
    igUserId: string,
    imageUrl: string,
    caption: string,
    accessToken: string
): Promise<string> {
    try {
        const response = await axios.post(
            `https://graph.instagram.com/${igUserId}/media`,
            null,
            {
                params: {
                    image_url: imageUrl,
                    caption: caption,
                    access_token: accessToken,
                },
            }
        );

        if (!response.data?.id) {
            throw new Error("No media ID received in response");
        }

        return response.data.id;
    } catch (error) {
        const axiosError = error as AxiosError;
        elizaLogger.error("Error creating media object:", {
            message: axiosError.message,
            response: axiosError.response?.data,
            status: axiosError.response?.status
        });
        throw new Error(`Failed to create media: ${axiosError.message}`);
    }
}

async function publishMedia(
    igUserId: string,
    creationId: string,
    accessToken: string
): Promise<string> {
    try {
        const response = await axios.post(
            `https://graph.instagram.com/${igUserId}/media_publish`,
            null,
            {
                params: {
                    creation_id: creationId,
                    access_token: accessToken,
                },
            }
        );

        if (!response.data?.id) {
            throw new Error("No post ID received in response");
        }

        return response.data.id;
    } catch (error) {
        const axiosError = error as AxiosError;
        elizaLogger.error("Error publishing media:", {
            message: axiosError.message,
            response: axiosError.response?.data,
            status: axiosError.response?.status
        });
        throw new Error(`Failed to publish media: ${axiosError.message}`);
    }
}

async function composePost(
    runtime: IAgentRuntime,
    message: Memory,
    state?: State
): Promise<{ imageUrl: string; caption: string }> {
    try {
        // Type check the content
        // Extract image URL from message content
        let imageUrl = '';
        let caption = '';

        if (message.content && typeof message.content === 'object') {
            // Try to get image URL from content object
            if ('imageUrl' in message.content && typeof message.content.imageUrl === 'string') {
                imageUrl = message.content.imageUrl;
            }
            // Try to get caption if provided
            if ('caption' in message.content && typeof message.content.caption === 'string') {
                caption = message.content.caption;
            }
        }

        // If we have an image URL but no caption, generate one
        if (imageUrl && !caption) {
            const context = composeContext({
                state,
                template: instagramPostTemplate,
            });

            const result = await generateObject({
                runtime,
                context,
                modelClass: ModelClass.SMALL,
                schema: InstagramPostSchema,
            });

            if (isInstagramPostContent(result.object)) {
                caption = result.object.caption;
            }
        }

        if (imageUrl) {
            return { imageUrl, caption };
        }

        // Fall back to generating content if not provided
        const context = composeContext({
            state,
            template: instagramPostTemplate,
        });

        const result = await generateObject({
            runtime,
            context,
            modelClass: ModelClass.SMALL,
            schema: InstagramPostSchema,
        });

        if (!isInstagramPostContent(result.object)) {
            elizaLogger.error("Invalid Instagram content generated:", result.object);
            throw new Error("Generated content does not match expected format");
        }

        return {
            imageUrl: result.object.imageUrl,
            caption: result.object.caption
        };
    } catch (error) {
        elizaLogger.error("Error composing Instagram post:", error);
        throw error;
    }
};

export const postAction: Action = {
    name: "POST_TO_INSTAGRAM",
    similes: ["POST_IG", "SHARE_ON_INSTAGRAM", "POST_ON_IG"],
    description: "Post a photo to Instagram",
    validate: async (
        runtime: IAgentRuntime,
        message: Memory,
        state?: State
    ): Promise<boolean> => {
        const hasCredentials =
            !!process.env.INSTAGRAM_ACCESS_TOKEN &&
            !!process.env.INSTAGRAM_USER_ID;

        console.log(`Has Instagram credentials: ${hasCredentials}`);
        return true;
    },
    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        state?: State
    ): Promise<boolean> => {
        console.log("Instagram handler starting..."); // Add this line
        try {
            const accessToken = process.env.INSTAGRAM_ACCESS_TOKEN;
            const igUserId = process.env.INSTAGRAM_USER_ID;

            if (!accessToken || !igUserId) {
                elizaLogger.error("Instagram credentials not configured");
                return false;
            }

            const postContent = await composePost(runtime, message, state);

            elizaLogger.log("Generated Instagram post content:", {
                imageUrl: postContent.imageUrl,
                captionLength: postContent.caption.length
            });

            if (process.env.INSTAGRAM_DRY_RUN?.toLowerCase() === "true") {
                elizaLogger.info("Dry run: would have posted to Instagram:", {
                    imageUrl: postContent.imageUrl,
                    caption: postContent.caption.substring(0, 50) + "..."
                });
                return true;
            }

            const creationId = await createMediaObject(
                igUserId,
                postContent.imageUrl,
                postContent.caption,
                accessToken
            );

            const postId = await publishMedia(
                igUserId,
                creationId,
                accessToken
            );

            elizaLogger.log("Successfully posted to Instagram with ID:", postId);
            return true;
        } catch (error) {
            console.error('Error details:', error);
            throw new Error(`Instagram post failed: ${error.message}`);
        }
    },
    examples: [
        [
            {
                user: "{{user1}}",
                content: {
                    text: "Post this on Instagram",
                    imageUrl: "https://example.com/image.jpg",
                    caption: "Check out this amazing photo!"
                },
            },
            {
                user: "{{agentName}}",
                content: {
                    text: "I'll share this photo on Instagram!",
                    action: "POST_TO_INSTAGRAM",
                },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: {
                    text: "Share this on IG",
                    imageUrl: "https://example.com/photo.jpg",
                    caption: "Beautiful sunset today!"
                },
            },
            {
                user: "{{agentName}}",
                content: {
                    text: "I'll post this to Instagram right away.",
                    action: "POST_TO_INSTAGRAM",
                },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: {
                    text: "Put this on Instagram please",
                    imageUrl: "https://example.com/pic.jpg",
                    caption: "Living my best life!"
                },
            },
            {
                user: "{{agentName}}",
                content: {
                    text: "I'll put this up on Instagram now.",
                    action: "POST_TO_INSTAGRAM",
                },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: {
                    text: "Can you post this to IG?",
                    imageUrl: "https://example.com/snap.jpg",
                    caption: "Perfect day for a picnic!"
                },
            },
            {
                user: "{{agentName}}",
                content: {
                    text: "Of course! I'll post it to Instagram for you.",
                    action: "POST_TO_INSTAGRAM",
                },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: {
                    text: "This should go on Instagram",
                    imageUrl: "https://example.com/moment.jpg",
                    caption: "Making memories!"
                },
            },
            {
                user: "{{agentName}}",
                content: {
                    text: "I agree, I'll share it on Instagram now.",
                    action: "POST_TO_INSTAGRAM",
                },
            },
        ]
    ],
};