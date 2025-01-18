import { IAgentRuntime } from '@elizaos/core';

/**
 * Runtime implementation for testing purposes.
 * Provides environment configuration access without requiring full IAgentRuntime implementation.
 */
export type TestAgentRuntime = Partial<IAgentRuntime> & {
    /** Environment variables for testing */
    env: Record<string, string>;
    /** Get environment variable value */
    getEnv: (key: string) => string | null;
    /** Get setting value (mirrors env for testing) */
    getSetting: (key: string) => string | null;
};

/**
 * Helper function to cast TestAgentRuntime to IAgentRuntime
 */
export const asIAgentRuntime = (runtime: TestAgentRuntime): IAgentRuntime => runtime as IAgentRuntime;