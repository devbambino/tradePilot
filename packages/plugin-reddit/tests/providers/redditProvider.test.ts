import { describe, it, expect, vi } from 'vitest';
import { redditProvider } from '../../src/providers/redditProvider';
import { mockRuntime } from '../setup';

describe('Reddit Provider', () => {
    it('should initialize with correct configuration', async () => {
        const data = await redditProvider.get(mockRuntime);
        expect(data).toBeDefined();
        expect(data.reddit).toBeDefined();
    });

    it('should throw error when missing credentials', async () => {
        const runtimeWithoutCreds = {
            ...mockRuntime,
            getSetting: vi.fn(() => undefined),
        };

        await expect(
            redditProvider.get(runtimeWithoutCreds)
        ).rejects.toThrow('Missing Reddit credentials');
    });

    it('should use correct credentials from runtime settings', async () => {
        const data = await redditProvider.get(mockRuntime);

        expect(mockRuntime.getSetting).toHaveBeenCalledWith('REDDIT_CLIENT_ID');
        expect(mockRuntime.getSetting).toHaveBeenCalledWith('REDDIT_CLIENT_SECRET');
        expect(mockRuntime.getSetting).toHaveBeenCalledWith('REDDIT_REFRESH_TOKEN');
        expect(mockRuntime.getSetting).toHaveBeenCalledWith('REDDIT_USER_AGENT');
    });

    it('should return reddit client instance', async () => {
        const data = await redditProvider.get(mockRuntime);
        expect(data).toHaveProperty('reddit');
    });

    it('should cache reddit client instance', async () => {
        // First call
        const data1 = await redditProvider.get(mockRuntime);
        // Second call
        const data2 = await redditProvider.get(mockRuntime);

        expect(data1.reddit).toBe(data2.reddit);
        expect(mockRuntime.getSetting).toHaveBeenCalledTimes(4); // Only called once for each setting
    });

    it('should handle network errors gracefully', async () => {
        vi.mock('snoowrap', () => {
            return {
                default: vi.fn().mockImplementation(() => {
                    throw new Error('Network Error');
                }),
            };
        });

        await expect(
            redditProvider.get(mockRuntime)
        ).rejects.toThrow('Failed to initialize Reddit client');
    });

    it('should validate user agent format', async () => {
        const runtimeWithInvalidUserAgent = {
            ...mockRuntime,
            getSetting: vi.fn((key: string) => {
                if (key === 'REDDIT_USER_AGENT') return '';
                return 'test_value';
            }),
        };

        await expect(
            redditProvider.get(runtimeWithInvalidUserAgent)
        ).rejects.toThrow('Invalid user agent');
    });
});

