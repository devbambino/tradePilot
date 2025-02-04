import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { ReadOnlyDiscourseClient } from "../client/ReadOnlyDiscourseClient";

describe("Posts from Discourse using Uniswap governance", () => {

    let client: ReadOnlyDiscourseClient;

    beforeEach(() => {
        vi.clearAllMocks();
        client = new ReadOnlyDiscourseClient('https://gov.uniswap.org/');
    });

    afterEach(() => {
        vi.clearAllTimers();
    });

    describe("getLatestPosts", () => {
        it("should return posts", async () => {
            const posts = await client.getLatestPosts();
            expect(posts).toBeDefined();
            expect(posts.length).toBeGreaterThanOrEqual(0);
        });

        it("should return formatted posts correctly", async () => {
            const posts = await client.getLatestPosts();
            if (posts.length === 0) {
                return;
            }

            expect(
                client.formatLatestPostsData([posts[0]])
            ).toEqual(
                `Post ID: ${posts[0].id}\nCreated At: ${posts[0].created_at}\nUsername: ${posts[0].username}\nRaw: ${posts[0].raw}\n\n`
            );
        })

        it("should throw an error for a bad url", async () => {
            const badClient = new ReadOnlyDiscourseClient('https://govs.uniswap.org/');
            await expect(badClient.getLatestPosts()).rejects.toThrow(
                "getaddrinfo ENOTFOUND govs.uniswap.org"
            );
        });
    });
});