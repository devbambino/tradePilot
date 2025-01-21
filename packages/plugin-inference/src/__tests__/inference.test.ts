/// <reference types="jest" />
import { matrix } from "mathjs";
import { InferencePlugin } from "../index";
import { GenerativeModel, InferenceConfig, ObservationData } from "../types";

describe("Active Inference Plugin", () => {
    let plugin: InferencePlugin;
    const agentId = "test_agent";

    beforeEach(async () => {
        plugin = new InferencePlugin();
        await plugin.init({} as any);
    });

    afterEach(async () => {
        await plugin.deleteInferenceEngine(agentId);
    });

    const createTestModel = (): GenerativeModel => ({
        C: matrix([0.8, 0.2]),
        B: [
            matrix([
                [0.9, 0.1],
                [0.1, 0.9],
            ]),
            matrix([
                [0.5, 0.5],
                [0.5, 0.5],
            ]),
        ],
        A: matrix([
            [0.9, 0.1],
            [0.2, 0.8],
        ]),
        D: matrix([0.5, 0.5]),
    });

    const createTestConfig = (): InferenceConfig => ({
        T: 3,
        alpha: 2.0,
        beta: 1.0,
        iterations: 5,
    });

    test("should create inference engine successfully", async () => {
        const model = createTestModel();
        const config = createTestConfig();

        await expect(
            plugin.createInferenceEngine(agentId, model, config),
        ).resolves.not.toThrow();
    });

    test("should handle danger signal appropriately", async () => {
        const model = createTestModel();
        const config = createTestConfig();
        await plugin.createInferenceEngine(agentId, model, config);

        const observation: ObservationData = { o: [1], t: 0 }; // Danger signal
        const action = await plugin.getAction(agentId, observation);

        expect(action).toHaveProperty("action");
        expect(action).toHaveProperty("G");
        expect(action).toHaveProperty("Q");
        expect(Array.isArray(action.G)).toBe(true);
        expect(action.G.length).toBeGreaterThan(0);
    });

    test("should handle safe signal appropriately", async () => {
        const model = createTestModel();
        const config = createTestConfig();
        await plugin.createInferenceEngine(agentId, model, config);

        const observation: ObservationData = { o: [0], t: 0 }; // Safe signal
        const action = await plugin.getAction(agentId, observation);

        expect(action.action).toBeDefined();
        expect(action.G).toBeInstanceOf(Array);
        expect(action.Q).toBeDefined();
    });

    test("should throw error for non-existent agent", async () => {
        const observation: ObservationData = { o: [0], t: 0 };
        await expect(
            plugin.getAction("nonexistent", observation),
        ).rejects.toThrow("No inference engine found for agent nonexistent");
    });

    test("should handle sequence of observations", async () => {
        const model = createTestModel();
        const config = createTestConfig();
        await plugin.createInferenceEngine(agentId, model, config);

        const observations: ObservationData[] = [
            { o: [1], t: 0 }, // Danger
            { o: [0], t: 1 }, // Safe
            { o: [1], t: 2 }, // Danger
        ];

        for (const obs of observations) {
            const action = await plugin.getAction(agentId, obs);
            expect(action.action).toBeDefined();
            expect(typeof action.action).toBe("number");
            expect(action.action).toBeGreaterThanOrEqual(0);
            expect(action.action).toBeLessThan(2);
        }
    });
});
