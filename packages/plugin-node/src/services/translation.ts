import {
    elizaLogger,
    IAgentRuntime,
    ITranslationService,
    TranslationProvider,
} from "@elizaos/core";
import { Service, ServiceType } from "@elizaos/core";
import OpenAI from "openai";

export class TranslationService extends Service implements ITranslationService {
    private runtime: IAgentRuntime | null = null;
    static serviceType: ServiceType = ServiceType.TRANSLATION;

    private translationProvider: TranslationProvider | null = null;

    private openai: OpenAI | null = null;

    async initialize(_runtime: IAgentRuntime): Promise<void> {
        this.runtime = _runtime;

        // 1) Check character settings
        let chosenProvider: TranslationProvider | null = null;
        const charSetting = this.runtime.character?.settings?.translation;

        if (charSetting === TranslationProvider.OpenAI) {
            const openaiKey = this.runtime.getSetting("OPENAI_API_KEY");
            if (openaiKey) {
                this.openai = new OpenAI({ apiKey: openaiKey });
                chosenProvider = TranslationProvider.OpenAI;
            }
        }

        // 2) If not chosen from character, check .env
        if (!chosenProvider) {
            const envProvider = this.runtime.getSetting("TRANSLATION_PROVIDER");
            if (envProvider) {
                switch (envProvider.toLowerCase()) {
                    case "openai":
                        const openaiKey =
                            this.runtime.getSetting("OPENAI_API_KEY");
                        if (openaiKey) {
                            this.openai = new OpenAI({ apiKey: openaiKey });
                            chosenProvider = TranslationProvider.OpenAI;
                        }
                        break;
                }
            }
        }

        // 3) If still none, fallback to old logic: OpenAI
        if (!chosenProvider) {
            const openaiKey = this.runtime.getSetting("OPENAI_API_KEY");
            if (openaiKey) {
                this.openai = new OpenAI({ apiKey: openaiKey });
                chosenProvider = TranslationProvider.OpenAI;
            } else {
                elizaLogger.error("TranslationService unable");
            }
        }

        this.translationProvider = chosenProvider;
    }

    constructor() {
        super();
    }

    public async translate(
        text: string,
        targetLanguages: string
    ): Promise<string | null> {
        switch (this.translationProvider) {
            case TranslationProvider.OpenAI:
                return await this.translateWithAI(text, targetLanguages);
            // TODO: Add others providers
            default:
                return null;
        }
    }

    private async translateWithAI(
        text: string,
        targetLanguages: string
    ): Promise<string | null> {
        elizaLogger.log("Translating text with OpenAI...");

        const completion = await this.openai!.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                {
                    role: "system",
                    content:
                        'You are a language translator and you will be provided with a text to translate and one or more target languages. Return the result of the translation in the target language(s) organized in a list with the target language and the translation separated by a colon. Example: "English: Hello, world!"',
                },
                {
                    role: "user",
                    content: `Translate the following text into ${targetLanguages}: ${text}`,
                },
            ],
            temperature: 1,
            max_tokens: 256,
            top_p: 1,
            frequency_penalty: 0,
            presence_penalty: 0,
        });

        return completion.choices[0].message.content;
    }

    getTranslationProvider() {
        return this.translationProvider;
    }
}
