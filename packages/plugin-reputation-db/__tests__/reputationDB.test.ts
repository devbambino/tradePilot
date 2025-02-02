import { ReputationDB } from "../src/reputationScoreDB";
import { TwitterAdapter } from "../src/adapters/twitterAdapter";
import { GivPowerAdapter } from "../src/adapters/givPowerAdapter";
import { MockAdapter } from "../src/adapters/mockAdapter";

jest.mock("better-sqlite3", () => {
    return jest.fn().mockImplementation(() => {
        return {
            prepare: () => ({
                all: jest.fn().mockReturnValue([]),
                get: jest.fn().mockReturnValue(null),
                run: jest.fn(),
            }),
            exec: jest.fn(),
            close: jest.fn(),
        };
    });
});

describe("ReputationDB", () => {
    let db: ReputationDB;
    let twitterAdapter: TwitterAdapter;
    let givPowerAdapter: GivPowerAdapter;
    let mockAdapter: MockAdapter;

    beforeAll(() => {
        twitterAdapter = new TwitterAdapter();
        givPowerAdapter = new GivPowerAdapter();
        mockAdapter = new MockAdapter();

        db = new ReputationDB(undefined, {
            twitter: twitterAdapter,
            givPower: givPowerAdapter,
            mock: mockAdapter,
        });
    });

    test("Should get Twitter score from cache if available", async () => {
        const spyQuery = jest.spyOn(db as any, "query").mockResolvedValueOnce({
            rows: [{ score: 80 }],
        });

        const score = await db.getScore("twitter", "example_handle");
        expect(score).toBe(80);
        expect(spyQuery).toHaveBeenCalledTimes(1);
        spyQuery.mockRestore();
    });

    test("Should refresh Twitter score when requested", async () => {
        const spyAdapter = jest.spyOn(twitterAdapter, "getScore").mockResolvedValueOnce(95);
        const spyQuery = jest.spyOn(db, "query");

        // random twitter handle
        const handle = new Date().getDate().toString()
        const score = await db.getScore("twitter", handle, true);
        await new Promise((resolve) => setImmediate(resolve)); // Wait for all async tasks

        console.log("Spy Query Call Count:", spyQuery.mock.calls.length);

        expect(score).toBe(95);
        expect(spyAdapter).toHaveBeenCalled();
        expect(spyQuery).toHaveBeenCalledTimes(1); // 1 for insert/update
        spyAdapter.mockRestore();
        spyQuery.mockRestore();
    });

    test("Should get GivPower score from cache if available", async () => {
        const spyQuery = jest.spyOn(db as any, "query").mockResolvedValueOnce({
            rows: [{ score: 60 }],
        });

        const score = await db.getScore("givPower", "0xExampleWalletAddress");
        expect(score).toBe(60);
        expect(spyQuery).toHaveBeenCalledTimes(1);
        spyQuery.mockRestore();
    });

    test("Should refresh GivPower score when requested", async () => {
        const spyAdapter = jest.spyOn(givPowerAdapter, "getScore").mockResolvedValueOnce(88);
        const spyQuery = jest.spyOn(db as any, "query").mockResolvedValueOnce({ rows: [] });

        const score = await db.getScore("givPower", "0xExampleWalletAddress", true);
        expect(score).toBe(88);
        expect(spyAdapter).toHaveBeenCalled();
        expect(spyQuery).toHaveBeenCalledTimes(1); //1 for insert/update
        spyAdapter.mockRestore();
        spyQuery.mockRestore();
    });

    test("Should fetch mock score (no cache)", async () => {
        const spyAdapter = jest.spyOn(mockAdapter, "getScore").mockResolvedValueOnce(50);
        const spyQuery = jest.spyOn(db as any, "query").mockResolvedValueOnce({ rows: [] });

        const score = await db.getScore("mock", "test_identifier");
        expect(score).toBe(50);
        expect(spyAdapter).toHaveBeenCalled();
        expect(spyQuery).toHaveBeenCalledTimes(2);
        spyAdapter.mockRestore();
        spyQuery.mockRestore();
    });

    test("Should store refreshed scores in the database", async () => {
        const spyAdapter = jest.spyOn(twitterAdapter, "getScore").mockResolvedValueOnce(75);
        const spyInsert = jest.spyOn(db as any, "query").mockResolvedValueOnce({ rows: [] });

        await db.getScore("twitter", "example_handle", true);
        expect(spyInsert).toHaveBeenCalledTimes(1);

        spyAdapter.mockRestore();
        spyInsert.mockRestore();
    });

    test("Should return correct score from database when available", async () => {
        const spyQuery = jest.spyOn(db as any, "query").mockResolvedValueOnce({
            rows: [{ score: 90 }],
        });

        const score = await db.getScore("twitter", "example_handle");
        expect(score).toBe(90);
        expect(spyQuery).toHaveBeenCalledTimes(1);
        spyQuery.mockRestore();
    });

    test("Should not fetch from adapter if score exists in cache", async () => {
        const spyQuery = jest.spyOn(db as any, "query").mockResolvedValueOnce({
            rows: [{ score: 70 }],
        });
        const spyAdapter = jest.spyOn(twitterAdapter, "getScore");

        const score = await db.getScore("twitter", "example_handle");
        expect(score).toBe(70);
        expect(spyQuery).toHaveBeenCalledTimes(1);
        expect(spyAdapter).not.toHaveBeenCalled();

        spyQuery.mockRestore();
        spyAdapter.mockRestore();
    });

    test("Should refresh all scores when requested", async () => {
        const spyTwitter = jest.spyOn(twitterAdapter, "getScore").mockResolvedValueOnce(85);
        const spyGivPower = jest.spyOn(givPowerAdapter, "getScore").mockResolvedValueOnce(92);

        const spyQuery = jest.spyOn(db as any, "query").mockResolvedValueOnce({ rows: [] });

        await db.refreshScoresForUser(["twitter", "givPower"], {
            twitterHandle: "example_handle",
            walletAddress: "0xExampleWalletAddress",
        });

        expect(spyTwitter).toHaveBeenCalled();
        expect(spyGivPower).toHaveBeenCalled();
        expect(spyQuery).toHaveBeenCalledTimes(2); //2 inserts/updates

        spyTwitter.mockRestore();
        spyGivPower.mockRestore();
        spyQuery.mockRestore();
    });

    test("Should refresh Twitter score when requested #2", async () => {
        const spyAdapter = jest.spyOn(db.adapters.get("twitter")!, "getScore");
        const spyQuery = jest.spyOn(db, "query");

        const score = await db.getScore("twitter", "example_handle", true);

        expect(score).toBeGreaterThanOrEqual(0); // ✅ Ensure score is a valid number
        expect(spyAdapter).toHaveBeenCalled(); // ✅ Adapter must be called for refresh
        expect(spyQuery).toHaveBeenCalledTimes(1); // ✅ 1 for insert/update

        spyAdapter.mockRestore();
        spyQuery.mockRestore();
    });

    test("Should refresh all scores when requested", async () => {
        const spyTwitter = jest.spyOn(db.adapters.get("twitter")!, "getScore");
        const spyGivPower = jest.spyOn(db.adapters.get("givPower")!, "getScore");
        const spyQuery = jest.spyOn(ReputationDB.prototype as any, "query").mockResolvedValue({ rows: [] });


        await db.refreshScoresForUser(["twitter", "givPower"], {
            twitterHandle: "example_handle",
            walletAddress: "0xExampleWalletAddress",
        });

        expect(spyTwitter).toHaveBeenCalled();
        expect(spyGivPower).toHaveBeenCalled();
        expect(spyQuery).toHaveBeenCalledTimes(2); // ✅ 2 updates

        spyTwitter.mockRestore();
        spyGivPower.mockRestore();
    });

});
