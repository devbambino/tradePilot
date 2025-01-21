import { describe, it, expect, vi } from 'vitest';
import { createPost } from '../../src/actions/post';
import { mockRuntime, mockMemory, mockRedditClient } from '../setup';

describe('CREATE_REDDIT_POST Action', () => {
    it('should validate with correct credentials', async () => {
        const result = await createPost.validate(mockRuntime, mockMemory);
        expect(result).toBe(true);
    });

    it('should fail validation with missing credentials', async () => {
        const runtimeWithoutCreds = {
            ...mockRuntime,
            getSetting: vi.fn(() => undefined),
        };

        const result = await createPost.validate(runtimeWithoutCreds, mockMemory);
        expect(result).toBe(false);
    });

    it('should successfully create a post', async () => {
        mockRedditClient.submitSelfpost.mockResolvedValueOnce({
            id: 'test_post_id',
            url: 'https://reddit.com/r/test/comments/test_post_id',
        });

        const result = await createPost.handler(
            mockRuntime,
            mockMemory,
            {},
            {}
        );

        expect(result).toBe(true);
        expect(mockRedditClient.submitSelfpost).toHaveBeenCalledWith({
            subredditName: expect.any(String),
            title: expect.any(String),
            text: expect.any(String),
        });
    });

    it('should handle post creation errors', async () => {
        mockRedditClient.submitSelfpost.mockRejectedValueOnce(
            new Error('Failed to create post')
        );

        const result = await createPost.handler(
            mockRuntime,
            mockMemory,
            {},
            {}
        );

        expect(result).toBe(false);
    });

    it('should have correct action name and similes', () => {
        expect(createPost.name).toBe('CREATE_REDDIT_POST');
        expect(createPost.similes).toContain('POST_TO_REDDIT');
        expect(createPost.similes).toContain('SUBMIT_REDDIT_POST');
    });

    it('should have valid examples', () => {
        expect(createPost.examples).toBeDefined();
        expect(createPost.examples.length).toBeGreaterThan(0);
        expect(createPost.examples[0]).toHaveLength(2);
        expect(createPost.examples[0][1].content.action).toBe('CREATE_REDDIT_POST');
    });
});
