import { describe, it, expect, vi, beforeEach } from "vitest";
import { TranslationService } from "../src/services/translation";
import { TranslationProvider, IAgentRuntime, elizaLogger } from "@elizaos/core";
import OpenAI from "openai";

// Mock dependencies
vi.mock("openai", () => {
    return {
        default: vi.fn(() => ({
            chat: {
                completions: {
                    create: vi.fn().mockResolvedValue({
                        choices: [
                            {
                                message: {
                                    content: "French: Bonjour, le monde!",
                                },
                            },
                        ],
                    }),
                },
            },
        })),
    };
});

vi.mock("@elizaos/core", async (importOriginal) => {
    const actual = await importOriginal();
    return {
        ...(actual as any),
        elizaLogger: {
            log: vi.fn(),
            error: vi.fn(),
        },
    };
});

describe("TranslationService", () => {
    let service: TranslationService;
    let mockRuntime: IAgentRuntime;

    beforeEach(() => {
        service = new TranslationService();

        mockRuntime = {
            character: {
                settings: {
                    translation: TranslationProvider.OpenAI,
                },
            },
            getSetting: vi.fn().mockImplementation((key: string) => {
                const settings = {
                    OPENAI_API_KEY: "test-openai-key",
                };
                return settings[key];
            }),
        } as unknown as IAgentRuntime;
    });

    describe("initialize", () => {
        it("should initialize with OpenAI provider if character setting is OpenAI", async () => {
            await service.initialize(mockRuntime);

            expect(service.getTranslationProvider()).toBe(
                TranslationProvider.OpenAI
            );
            expect(OpenAI).toHaveBeenCalledWith({
                apiKey: "test-openai-key",
            });
        });

        it("should fallback to OpenAI if no character provider is set", async () => {
            mockRuntime.character.settings!.translation = undefined;

            await service.initialize(mockRuntime);

            expect(service.getTranslationProvider()).toBe(
                TranslationProvider.OpenAI
            );
            expect(OpenAI).toHaveBeenCalledWith({
                apiKey: "test-openai-key",
            });
        });

        it("should log an error if no provider and no API key is available", async () => {
            mockRuntime.character.settings!.translation = undefined;
            mockRuntime.getSetting = vi.fn(() => null);

            await service.initialize(mockRuntime);

            expect(service.getTranslationProvider()).toBeNull();
            expect(elizaLogger.error).toHaveBeenCalledWith(
                "TranslationService unable"
            );
        });
    });

    describe("translate", () => {
        it("should use OpenAI to translate text if provider is OpenAI", async () => {
            await service.initialize(mockRuntime);

            const result = await service.translate("Hello, world!", "French");

            expect(result).toBe("French: Bonjour, le monde!");

            expect(OpenAI).toHaveBeenCalledWith({ apiKey: "test-openai-key" });
            expect(result).toBe("French: Bonjour, le monde!");
        });

        it("should return null if no provider is set", async () => {
            mockRuntime.character.settings!.translation = undefined;
            mockRuntime.getSetting = vi.fn(() => null);

            await service.initialize(mockRuntime);

            const result = await service.translate("Hello, world!", "French");
            expect(result).toBeNull();
        });
    });

    describe("getTranslationProvider", () => {
        it("should return the current translation provider", async () => {
            await service.initialize(mockRuntime);

            expect(service.getTranslationProvider()).toBe(
                TranslationProvider.OpenAI
            );
        });
    });
});
