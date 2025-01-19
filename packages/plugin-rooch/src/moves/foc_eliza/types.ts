export interface Style {
    all: string[];
    chat: string[];
    post: string[];
}

export interface TwitterProfile {
    id: string;
    username: string;
    screenName: string;
    bio: string;
    nicknames: string[];
}

export interface MessageTemplate {
    user: string;
    content: Content;
}

export interface Content {
    text: string;
    action: string | null;
    source: string | null;
    url: string | null;
    inReplyTo: string | null;
    attachments: Media[];
}

export interface Media {
    id: string;
    url: string;
    title: string;
    source: string;
    description: string;
    text: string;
    contentType: string;
}

export interface CharacterData {
    id: string | null;
    name: string;
    username: string | null;
    plugins: string[];
    clients: string[];
    modelProvider: string;
    imageModelProvider: string | null;
    imageVisionModelProvider: string | null;
    modelEndpointOverride: string | null;
    system: string | null;
    bio: string[];
    lore: string[];
    messageExamples: MessageTemplate[][];
    postExamples: string[];
    topics: string[];
    style: Style;
    adjectives: string[];
    knowledge: string[];
    twitterProfile: TwitterProfile | null;
    settings: any;
}