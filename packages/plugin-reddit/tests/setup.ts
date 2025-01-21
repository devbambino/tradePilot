import { beforeAll, afterAll, vi } from 'vitest';
import { IAgentRuntime, Memory } from '@elizaos/core';

export const mockRedditClient = {
    submitSelfpost: vi.fn(),
    getSubreddit: vi.fn(),
    getSubmission: vi.fn(),
    getComment: vi.fn(),
};

export const mockRuntime: IAgentRuntime = {
    getSetting: vi.fn((key: string) => {
        switch (key) {
            case 'REDDIT_CLIENT_ID':
                return 'test_client_id';
            case 'REDDIT_CLIENT_SECRET':
                return 'test_client_secret';
            case 'REDDIT_REFRESH_TOKEN':
                return 'test_refresh_token';
            case 'REDDIT_USER_AGENT':
                return 'test_user_agent';
            default:
                return undefined;
        }
    }),
    getProvider: vi.fn().mockResolvedValue({ reddit: mockRedditClient }),
};

export const mockMemory: Memory = {
    id: 'test-memory',
    roomId: 'test-room',
    timestamp: new Date(),
    user: 'test-user',
    content: {
        text: 'Post this to r/test: Hello Reddit!',
    },
};

beforeAll(() => {
    vi.clearAllMocks();
});

afterAll(() => {
    vi.resetAllMocks();
});
