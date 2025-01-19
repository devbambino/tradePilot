import { Style, TwitterProfile, MessageTemplate, Content, Media, CharacterData } from "./types"

// Helper function to convert a hex string to a UTF-8 string, returning an empty string on failure
function hexToString(hex: string): string {
    if (!hex) return '';
    const cleanHex = hex.replace(/^0x/, '');
    let bytes: Buffer;
    try {
        bytes = Buffer.from(cleanHex, 'hex');
    } catch {
        return '';
    }
    return bytes.toString('utf8');
}

// Tries to parse a string directly or from a Move Option<String>-like structure
function parseString(value: any): string {
    if (typeof value === 'string') {
        return value;
    } else if (value && Array.isArray(value) && value.length > 0) {
        return hexToString(value[0]);
    }

    return null;
}

// Tries to parse a string or return null if not present
function parseStringOrNull(value: any): string | null {
    return parseString(parseOption(value));
}

// Tries to parse an array of strings, either directly or from an object with a .value array
function parseStringArray(value: any): string[] {
    if (!value) return [];
    if (Array.isArray(value) && value.every(item => typeof item === 'string')) {
        return value;
    }
    // If it's an object with a .value array, try to parse each item as a string/hex
    if (value.value && Array.isArray(value.value)) {
        return value.value.map((item: any) => parseString(item));
    }
    return [];
}

// Style interface must parse all/chat/post
function parseStyle(styleValue: any): Style {
    if (!styleValue) {
        return { all: [], chat: [], post: [] };
    }
    return {
        all: parseStringArray(styleValue.all),
        chat: parseStringArray(styleValue.chat),
        post: parseStringArray(styleValue.post)
    };
}

// TwitterProfile parser
function parseTwitterProfile(profileValue: any): TwitterProfile | null {
    // For simpler data structures, assume direct fields or return null if missing
    if (!profileValue) return null;

    return {
        id: parseString(profileValue.id),
        username: parseString(profileValue.username),
        screenName: parseString(profileValue.screenName),
        bio: parseString(profileValue.bio),
        nicknames: Array.isArray(profileValue.nicknames)
            ? profileValue.nicknames.map((n: any) => parseString(n))
            : []
    };
}

function parseOption(objectValue: any): TwitterProfile | null {
    if (!objectValue) {
        return null;
    }

    if (objectValue.type && objectValue.type.startsWith('0x1::option::Option<')) {
        if (objectValue.value.length > 0) {
            return objectValue.value[0];
        } else {
            return null;
        }
    } else {
        if (objectValue.value) {
            return objectValue.value;
        }

        return objectValue;
    }
}

// Media parser
function parseMedia(mediaValue: any): Media {
    if (!mediaValue) {
        return {
            id: '',
            url: '',
            title: '',
            source: '',
            description: '',
            text: '',
            contentType: ''
        };
    }
    return {
        id: parseString(mediaValue.id),
        url: parseString(mediaValue.url),
        title: parseString(mediaValue.title),
        source: parseString(mediaValue.source),
        description: parseString(mediaValue.description),
        text: parseString(mediaValue.text),
        contentType: parseString(mediaValue.contentType)
    };
}

// Vector<Media>
function parseVectorMedia(mediaVector: any): Media[] {
    if (!Array.isArray(mediaVector)) {
        return [];
    }
    return mediaVector.map(item => parseMedia(item));
}

// Content parser
function parseContent(contentValue: any): Content {
    if (!contentValue) {
        return {
            text: '',
            action: null,
            source: null,
            url: null,
            inReplyTo: null,
            attachments: []
        };
    }
    return {
        text: parseString(contentValue.text),
        action: parseStringOrNull(contentValue.action),
        source: parseStringOrNull(contentValue.source),
        url: parseStringOrNull(contentValue.url),
        inReplyTo: parseStringOrNull(contentValue.inReplyTo),
        attachments: Array.isArray(contentValue.attachments?.value)
            ? parseVectorMedia(contentValue.attachments.value)
            : []
    };
}

// MessageTemplate parser
function parseMessageTemplate(templateValue: any): MessageTemplate {
    if (!templateValue) {
        return {
            user: '',
            content: {
                text: '',
                action: null,
                source: null,
                url: null,
                inReplyTo: null,
                attachments: []
            }
        };
    }
    return {
        user: parseString(templateValue[0]),
        content: parseContent(templateValue[1].value)
    };
}

// Main parser for CharacterData
function parseCharacterData(decodedValue: any): CharacterData {
    if (!decodedValue) {
        return {
            id: null,
            name: '',
            username: null,
            plugins: [],
            clients: [],
            modelProvider: '',
            imageModelProvider: null,
            imageVisionModelProvider: null,
            modelEndpointOverride: null,
            system: null,
            bio: [],
            lore: [],
            messageExamples: [],
            postExamples: [],
            topics: [],
            style: { all: [], chat: [], post: [] },
            adjectives: [],
            knowledge: [],
            twitterProfile: null
        };
    }
    return {
        id: parseStringOrNull(decodedValue.id),
        name: parseString(decodedValue.name),
        username: parseStringOrNull(decodedValue.username),
        plugins: parseStringArray(decodedValue.plugins),
        clients: parseStringArray(decodedValue.clients),
        modelProvider: parseString(decodedValue.modelProvider),
        imageModelProvider: parseStringOrNull(decodedValue.imageModelProvider),
        imageVisionModelProvider: parseStringOrNull(decodedValue.imageVisionModelProvider),
        modelEndpointOverride: parseStringOrNull(decodedValue.modelEndpointOverride),
        system: parseStringOrNull(decodedValue.system),
        bio: parseStringArray(decodedValue.bio),
        lore: parseStringArray(decodedValue.lore),
        messageExamples: Array.isArray(decodedValue.messageExamples)
            ? decodedValue.messageExamples.map((group: any) =>
                Array.isArray(group.value)
                    ? group.value.map(item => parseMessageTemplate(item))
                    : []
              )
            : [],
        postExamples: parseStringArray(decodedValue.postExamples),
        topics: parseStringArray(decodedValue.topics),
        style: parseStyle(decodedValue.style.value),
        adjectives: parseStringArray(decodedValue.adjectives),
        knowledge: parseStringArray(decodedValue.knowledge),
        twitterProfile: parseTwitterProfile(parseOption(decodedValue.twitterProfile))
    };
}

// Helper function to remove null values from an object
function removeNullValues(obj: any): any {
    if (Array.isArray(obj)) {
        return obj.map(item => removeNullValues(item));
    }
    if (obj !== null && typeof obj === 'object') {
        const result: any = {};
        for (const key in obj) {
            const value = removeNullValues(obj[key]);
            if (value !== null) {
                result[key] = value;
            }
        }
        return result;
    }
    return obj;
}

// Modified decodeCharacterData function
export function decodeCharacterData(decoded_value: any): CharacterData {
    const parsed = parseCharacterData(decoded_value);
    if (parsed) {
        parsed.settings = {}
    }

    return removeNullValues(parsed) as CharacterData;
}