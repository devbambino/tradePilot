import { matrix } from "mathjs";
import { InferencePlugin } from "../index";
import { GenerativeModel, InferenceConfig, ObservationData } from "../types";

async function runInferenceExample() {
    console.log("Starting Active Inference Example...\n");

    // Create plugin instance
    const plugin = new InferencePlugin();
    await plugin.init({} as any); // Mock context for example

    // Create a simple two-state world model
    // State 0: Safe state
    // State 1: Dangerous state
    const model: GenerativeModel = {
        // Observation model (likelihood mapping)
        // Observation 0: Safe signal
        // Observation 1: Danger signal
        A: matrix([
            [0.9, 0.1], // Safe state generates mostly safe signals
            [0.2, 0.8], // Dangerous state generates mostly danger signals
        ]),

        // State transition probabilities for each action
        // Action 0: Stay/Observe
        // Action 1: Move/Change
        B: [
            // Action 0 transitions
            matrix([
                [0.9, 0.1], // From safe state
                [0.1, 0.9], // From dangerous state
            ]),
            // Action 1 transitions
            matrix([
                [0.5, 0.5], // From safe state
                [0.5, 0.5], // From dangerous state
            ]),
        ],

        // Prior preferences: Agent prefers safe state (0) over dangerous state (1)
        C: matrix([0.8, 0.2]),

        // Initial state prior (uniform)
        D: matrix([0.5, 0.5]),
    };

    // Configure inference parameters
    const config: InferenceConfig = {
        T: 3, // Plan 3 steps ahead
        alpha: 2.0, // Higher precision for more deterministic action selection
        beta: 1.0, // Moderate state transition noise
        iterations: 5, // Number of belief update iterations
    };

    // Create inference engine for test agent
    const agentId = "test_agent";
    await plugin.createInferenceEngine(agentId, model, config);

    // Test sequence of observations and actions
    const observations: ObservationData[] = [
        { o: [1], t: 0 }, // Danger signal
        { o: [0], t: 1 }, // Safe signal
        { o: [1], t: 2 }, // Danger signal
    ];

    console.log("Running inference with observations:");
    for (const obs of observations) {
        console.log(`\nTime step ${obs.t}:`);
        console.log(
            `Observation: ${obs.o[0] === 0 ? "Safe" : "Danger"} signal`
        );

        const action = await plugin.getAction(agentId, obs);

        console.log("Inference results:");
        console.log(
            `- Selected action: ${
                action.action === 0 ? "Stay/Observe" : "Move/Change"
            }`
        );
        console.log(`- Expected free energies:`, action.G);
        console.log(`- State beliefs:`, action.Q.toArray());
    }

    // Clean up
    await plugin.deleteInferenceEngine(agentId);
    console.log("\nExample completed successfully!");
}

// Run the example
runInferenceExample().catch(console.error);

// Export for testing
export { runInferenceExample };
