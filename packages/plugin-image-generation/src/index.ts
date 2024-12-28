import { elizaLogger } from "@elizaos/core";
import {
    Action,
    composeContext,
    generateText,
    HandlerCallback,
    IAgentRuntime,
    Memory,
    ModelClass,
    Plugin,
    State,
    //generateCaption,
    generateImage,
    settings,
} from "@elizaos/core";
import fs from "fs";
import path from "path";
import { validateImageGenConfig } from "./environment";

/**
 * Template for generating image descriptions in the agent's voice.
 * Uses various context elements like knowledge, bio, and recent posts
 * to maintain consistent character voice.
 */
const imagePromptTemplate = `# Knowledge
{{knowledge}}

About {{agentName}}:
{{bio}}
{{lore}}
{{postDirections}}

{{providers}}

{{recentPosts}}

# Task: Generate an image description in the voice and style of {{agentName}} according to the previous <user_message>.
Write a short image description that considers the <user_message> complemented by {{adjective}} about {{topic}} from the perspective of {{agentName}}. Try to write something totally different than previous posts. Do not add commentary or acknowledge this request, just write the description of the image to be generated.
Your response should not contain any questions. Brief, concise statements only. No emojis. Use \\n\\n (double spaces) between statements.`;

/**
 * Prompt for the image generation AI to create detailed, high-quality prompts
 * that will produce visually appealing images.
 */
const imageGenerationPrompt = "You are an AI assistant specialized in crafting effective prompts for image generation. Your task is to analyze a user's message and create a comprehensive, natural-language prompt that will guide an image generation algorithm to produce high-quality, visually appealing images.\n\nBegin by analyzing the content of the user's message. Follow these steps:\n\n1. List out key elements from the user's message, categorizing them to ensure comprehensive coverage:\n   * Topic: The main subject or scene with specific details\n   * Material: The medium or style (e.g., digital painting, 3D render)\n   * Style: The artistic direction (e.g., fantasy, vaporwave)\n   * Artist: Specific artists to influence the visual style\n   * Webpage Influence: Art platforms like ArtStation or DeviantArt for quality enhancement\n   * Sharpness: Terms like \"sharp focus\" or \"highly detailed\" for clarity\n   * Extra Details: Descriptors to enhance atmosphere (e.g., cinematic, dystopian)\n   * Shade and Color: Color-related keywords to control mood (e.g., moody lighting)\n   * Lighting and Brightness: Specific lighting styles (e.g., dramatic shadows)\n   * Camera Angle: Perspective and framing (e.g., close-up, wide shot, aerial view)\n   * Composition: Layout guidance (e.g., rule of thirds, centered, dynamic)\n   * Time Period: Temporal context if relevant\n   * Cultural Elements: Any specific cultural influences\n   * Textures: Surface quality descriptions\n   * Weather/Atmosphere: Environmental conditions if applicable\n   * Negative Prompts: Elements to exclude from the image\n\n2. Brainstorm complementary elements that would enhance the user's vision:\n   * Suggest fitting artists and styles if not specified\n   * Consider atmospheric elements that would strengthen the concept\n   * Identify potential technical aspects that would improve the result\n   * Note any elements that should be avoided to maintain the desired look\n\n3. Construct your final prompt by:\n   * Leading with the most important scene/subject details from the user's message\n   * Incorporating all relevant technical and stylistic elements\n   * Grouping related concepts together naturally\n   * Maintaining clear, flowing language throughout\n   * Adding complementary details that enhance but don't alter the core concept\n   * Concluding with negative prompts separated by a \"Negative:\" marker\n\nRemember:\n- Preserve ALL specific details from the user's original message\n- Don't force details into a rigid template\n- Create a cohesive, readable description\n- Keep the focus on the user's core concept while enhancing it with technical and artistic refinements\n\nYour output should contain ONLY the final prompt text, with no additional explanations, tags, or formatting.";

/**
 * Saves a base64-encoded image to the local filesystem
 * @param base64Data - The base64-encoded image data
 * @param filename - Name to use for the saved file (without extension)
 * @returns The full filepath where the image was saved
 */
export function saveBase64Image(base64Data: string, filename: string): string {
    // Create generatedImages directory if it doesn't exist
    const imageDir = path.join(process.cwd(), "generatedImages");
    if (!fs.existsSync(imageDir)) {
        fs.mkdirSync(imageDir, { recursive: true });
    }

    // Remove the data:image/png;base64 prefix if it exists
    const base64Image = base64Data.replace(/^data:image\/\w+;base64,/, "");

    // Create a buffer from the base64 string
    const imageBuffer = Buffer.from(base64Image, "base64");

    // Create full file path
    const filepath = path.join(imageDir, `${filename}.png`);

    // Save the file
    fs.writeFileSync(filepath, imageBuffer);

    return filepath;
}

/**
 * Saves an image from a Heurist URL to the local filesystem
 * @param imageUrl - URL of the image to download and save
 * @param filename - Name to use for the saved file (without extension)
 * @returns Promise resolving to the full filepath where the image was saved
 */
export async function saveHeuristImage(
    imageUrl: string,
    filename: string
): Promise<string> {
    const imageDir = path.join(process.cwd(), "generatedImages");
    if (!fs.existsSync(imageDir)) {
        fs.mkdirSync(imageDir, { recursive: true });
    }

    // Fetch image from URL
    const response = await fetch(imageUrl);
    if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.statusText}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const imageBuffer = Buffer.from(arrayBuffer);

    // Create full file path
    const filepath = path.join(imageDir, `${filename}.png`);

    // Save the file
    fs.writeFileSync(filepath, imageBuffer);

    return filepath;
}

/**
 * Action definition for image generation capability
 * Handles generating images based on user prompts while maintaining agent personality
 */
const imageGeneration: Action = {
    name: "GENERATE_IMAGE",
    // Alternative action names that should trigger image generation
    similes: [
        "IMAGE_GENERATION",
        "IMAGE_GEN",
        "CREATE_IMAGE",
        "MAKE_PICTURE",
        "GENERATE_IMAGE",
        "GENERATE_A",
        "DRAW",
        "DRAW_A",
        "MAKE_A",
    ],
    description: "Generate an image to go along with the message.",
    suppressInitialMessage: true,
    validate: async (runtime: IAgentRuntime, _message: Memory) => {
        await validateImageGenConfig(runtime);

        const anthropicApiKeyOk = !!runtime.getSetting("ANTHROPIC_API_KEY");
        const togetherApiKeyOk = !!runtime.getSetting("TOGETHER_API_KEY");
        const heuristApiKeyOk = !!runtime.getSetting("HEURIST_API_KEY");
        const falApiKeyOk = !!runtime.getSetting("FAL_API_KEY");
        const openAiApiKeyOk = !!runtime.getSetting("OPENAI_API_KEY");
        const veniceApiKeyOk = !!runtime.getSetting("VENICE_API_KEY");

        return (
            anthropicApiKeyOk ||
            togetherApiKeyOk ||
            heuristApiKeyOk ||
            falApiKeyOk ||
            openAiApiKeyOk ||
            veniceApiKeyOk
        );
    },

    /**
     * Main handler for image generation:
     * 1. Generates an image description in the agent's voice
     * 2. Converts that description into an optimized image generation prompt
     * 3. Generates the image
     * 4. Saves and returns the result
     */
    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        state: State,
        options: {
            width?: number;
            height?: number;
            count?: number;
            negativePrompt?: string;
            numIterations?: number;
            guidanceScale?: number;
            seed?: number;
            modelId?: string;
            jobId?: string;
            stylePreset?: string;
            hideWatermark?: boolean;
        },
        callback: HandlerCallback
    ) => {
        const agentContext = composeContext({
            state,
            template:
                runtime.character.templates?.imagePromptTemplate ||
                imagePromptTemplate,
        });

        // Generate the initial prompt in agent's voice
        const agentImagePrompt = await generateText({
            runtime,
            context: `${agentContext}\n\n<user_message>${message.content.text}</user_message>`,
            modelClass: ModelClass.SMALL,
        });

        elizaLogger.log("Agent prompt & caption for image: ", agentImagePrompt);

        const userId = runtime.agentId;
        elizaLogger.log("User ID:", userId);

        // Convert agent's description into an optimized image generation prompt
        const context = runtime.character.system ??
        settings.SYSTEM_PROMPT ?? imageGenerationPrompt + `\n\nHere is the user's message:\n<user_message> ${agentImagePrompt} </user_message>`;

        const imagePrompt = await generateText({
            runtime,
            context,
            modelClass: ModelClass.SMALL,
        });
        const imageSettings = runtime.character?.settings?.imageSettings || {};
        elizaLogger.log("Image settings:", imageSettings);

        // TODO: Generate a prompt for the image
        const res: { image: string; caption: string }[] = [];

        // Generate the actual image
        elizaLogger.log("Generating image with prompt:", imagePrompt);
        const images = await generateImage(
            {
                prompt: imagePrompt,
                width: options.width || imageSettings.width || 1024,
                height: options.height || imageSettings.height || 1024,
                ...(options.count != null || imageSettings.count != null ? { count: options.count || imageSettings.count || 1 } : {}),
                ...(options.negativePrompt != null || imageSettings.negativePrompt != null ? { negativePrompt: options.negativePrompt || imageSettings.negativePrompt } : {}),
                ...(options.numIterations != null || imageSettings.numIterations != null ? { numIterations: options.numIterations || imageSettings.numIterations } : {}),
                ...(options.guidanceScale != null || imageSettings.guidanceScale != null ? { guidanceScale: options.guidanceScale || imageSettings.guidanceScale } : {}),
                ...(options.seed != null || imageSettings.seed != null ? { seed: options.seed || imageSettings.seed } : {}),
                ...(options.modelId != null || imageSettings.modelId != null ? { modelId: options.modelId || imageSettings.modelId } : {}),
                ...(options.jobId != null || imageSettings.jobId != null ? { jobId: options.jobId || imageSettings.jobId } : {}),
                ...(options.stylePreset != null || imageSettings.stylePreset != null ? { stylePreset: options.stylePreset || imageSettings.stylePreset } : {}),
                ...(options.hideWatermark != null || imageSettings.hideWatermark != null ? { hideWatermark: options.hideWatermark || imageSettings.hideWatermark } : {}),
            },
            runtime
        );

        // Process and save generated images
        if (images.success && images.data && images.data.length > 0) {
            elizaLogger.log(
                "Image generation successful, number of images:",
                images.data.length
            );
            for (let i = 0; i < images.data.length; i++) {
                const image = images.data[i];

                // Save the image and get filepath
                const filename = `generated_${Date.now()}_${i}`;

                // Choose save function based on image data format
                const filepath = image.startsWith("http")
                    ? await saveHeuristImage(image, filename)
                    : saveBase64Image(image, filename);

                elizaLogger.log(`Processing image ${i + 1}:`, filename);

                res.push({ image: filepath, caption: agentImagePrompt });

                callback(
                    {
                        text: agentImagePrompt,
                        attachments: [
                            {
                                id: crypto.randomUUID(),
                                url: filepath,
                                title: "Generated image",
                                source: "imageGeneration",
                                description: imagePrompt, // caption.title?
                                text: agentImagePrompt,
                                contentType: "image/png",
                            },
                        ],
                    },
                    [
                        {
                            attachment: filepath,
                            name: `${filename}.png`,
                        },
                    ]
                );
            }
        } else {
            elizaLogger.error("Image generation failed or returned no data.");
        }
    },

    // Example interactions that should trigger image generation
    examples: [
        // TODO: We want to generate images in more abstract ways, not just when asked to generate an image

        [
            {
                user: "{{user1}}",
                content: { text: "Generate an image of a cat" },
            },
            {
                user: "{{agentName}}",
                content: {
                    text: "Here's an image of a cat",
                    action: "GENERATE_IMAGE",
                },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: { text: "Generate an image of a dog" },
            },
            {
                user: "{{agentName}}",
                content: {
                    text: "Here's an image of a dog",
                    action: "GENERATE_IMAGE",
                },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: { text: "Create an image of a cat with a hat" },
            },
            {
                user: "{{agentName}}",
                content: {
                    text: "Here's an image of a cat with a hat",
                    action: "GENERATE_IMAGE",
                },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: { text: "Make an image of a dog with a hat" },
            },
            {
                user: "{{agentName}}",
                content: {
                    text: "Here's an image of a dog with a hat",
                    action: "GENERATE_IMAGE",
                },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: { text: "Paint an image of a cat with a hat" },
            },
            {
                user: "{{agentName}}",
                content: {
                    text: "Here's an image of a cat with a hat",
                    action: "GENERATE_IMAGE",
                },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: { text: "Show me a picture of you" },
            },
            {
                user: "{{agentName}}",
                content: {
                    text: "Here's a picture of me",
                    action: "GENERATE_IMAGE",
                },
            },
        ],
    ],
} as Action;

/**
 * Plugin definition for image generation functionality
 */
export const imageGenerationPlugin: Plugin = {
    name: "imageGeneration",
    description: "Generate images",
    actions: [imageGeneration],
    evaluators: [],
    providers: [],
};
