import { describe, it, expect, vi } from 'vitest';
import { validateTwitterConfig } from '../src/environment';
import { IAgentRuntime } from '@elizaos/core';
import { TestAgentRuntime, asIAgentRuntime } from './test-utils';

describe('Twitter Environment Configuration', () => {
    const mockRuntime = {
        env: {
            TWITTER_USERNAME: 'testuser123',
            TWITTER_DRY_RUN: 'true',
            TWITTER_SEARCH_ENABLE: 'false',
            TWITTER_SPACES_ENABLE: 'false',
            TWITTER_TARGET_USERS: 'user1,user2,user3',
            TWITTER_MAX_TWEETS_PER_DAY: '10',
            TWITTER_POST_INTERVAL_MIN: '90',
            TWITTER_POST_INTERVAL_MAX: '180',
            TWITTER_ACTION_INTERVAL: '5',
            TWITTER_ENABLE_ACTION_PROCESSING: 'false',
            TWITTER_POST_IMMEDIATELY: 'false',
            TWITTER_EMAIL: 'test@example.test',
            TWITTER_PASSWORD: 'test_password',
            TWITTER_2FA_SECRET: '',
            TWITTER_POLL_INTERVAL: '120',
            TWITTER_RETRY_LIMIT: '5',
            ACTION_TIMELINE_TYPE: 'foryou',
            MAX_ACTIONS_PROCESSING: '1',
            MAX_TWEET_LENGTH: '280'
        },
        getEnv: function (key: string) {
            return this.env[key] || null;
        },
        getSetting: function (key: string) {
            return this.env[key] || null;
        }
    } as TestAgentRuntime;

    it('should validate correct configuration', async () => {
        const config = await validateTwitterConfig(mockRuntime as IAgentRuntime);
        expect(config).toBeDefined();
        expect(config.TWITTER_USERNAME).toBe('testuser123');
        expect(config.TWITTER_DRY_RUN).toBe(true);
        expect(config.TWITTER_SEARCH_ENABLE).toBe(false);
        expect(config.TWITTER_SPACES_ENABLE).toBe(false);
        expect(config.TWITTER_TARGET_USERS).toEqual(['user1', 'user2', 'user3']);
        expect(config.MAX_TWEET_LENGTH).toBe(280);
        expect(config.POST_INTERVAL_MIN).toBe(90);
        expect(config.POST_INTERVAL_MAX).toBe(180);
        expect(config.ACTION_INTERVAL).toBe(5);
        expect(config.ENABLE_ACTION_PROCESSING).toBe(false);
        expect(config.POST_IMMEDIATELY).toBe(false);
    });

    it('should validate wildcard username', async () => {
        const wildcardRuntime = {
            env: {
                ...mockRuntime.env,
                TWITTER_USERNAME: '*'
            },
            getEnv: function(key: string) {
                return this.env[key] || null;
            },
            getSetting: function(key: string) {
                return this.env[key] || null;
            }
        } as TestAgentRuntime;

        const config = await validateTwitterConfig(asIAgentRuntime(wildcardRuntime));
        expect(config.TWITTER_USERNAME).toBe('*');
    });

    it('should validate username with numbers and underscores', async () => {
        const validRuntime = {
            env: {
                ...mockRuntime.env,
                TWITTER_USERNAME: 'test_user_123'
            },
            getEnv: function(key: string) {
                return this.env[key] || null;
            },
            getSetting: function(key: string) {
                return this.env[key] || null;
            }
        } as TestAgentRuntime;

        const config = await validateTwitterConfig(validRuntime as IAgentRuntime);
        expect(config.TWITTER_USERNAME).toBe('test_user_123');
    });

    it('should handle empty target users', async () => {
        const runtimeWithoutTargets = {
            env: {
                ...mockRuntime.env,
                TWITTER_TARGET_USERS: ''
            },
            getEnv: function(key: string) {
                return this.env[key] || null;
            },
            getSetting: function(key: string) {
                return this.env[key] || null;
            }
        } as TestAgentRuntime;

        const config = await validateTwitterConfig(runtimeWithoutTargets as IAgentRuntime);
        expect(config.TWITTER_TARGET_USERS).toHaveLength(0);
    });

    it('should use default values when optional configs are missing', async () => {
        const minimalRuntime = {
            env: {
                TWITTER_USERNAME: 'testuser',
                TWITTER_DRY_RUN: 'true',
                TWITTER_EMAIL: 'test@example.com',
                TWITTER_PASSWORD: 'hashedpassword',
                TWITTER_2FA_SECRET: '',
                MAX_TWEET_LENGTH: '280'
            },
            getEnv: function (key: string) {
                return this.env[key] || null;
            },
            getSetting: function (key: string) {
                return this.env[key] || null;
            }
        } as unknown as IAgentRuntime;

        const config = await validateTwitterConfig(minimalRuntime);
        expect(config).toBeDefined();
        expect(config.MAX_TWEET_LENGTH).toBe(280);
        expect(config.POST_INTERVAL_MIN).toBe(90);
        expect(config.POST_INTERVAL_MAX).toBe(180);
    });
});
