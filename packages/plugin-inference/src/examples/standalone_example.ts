import { matrix, MathNumericType } from "mathjs";
import { ActiveInference } from "../inference";
import { GenerativeModel, InferenceConfig, ObservationData } from "../types";
import * as fs from "fs";
import * as path from "path";
import {
    InferenceVisualizer,
    TimeStepData,
} from "../utils/inference-visualizations";
import { execSync } from "child_process";
import { existsSync, mkdirSync } from "fs";

// Logger class for saving results
class Logger {
    private logFile: string;
    private buffer: string[] = [];
    private debugEnabled: boolean = false;

    constructor(filename: string, debug: boolean = false) {
        this.logFile = filename;
        this.debugEnabled = debug;
        this.buffer = [];
        this.log("Active Inference Example Log");
        this.log(`Timestamp: ${new Date().toISOString()}`);
        this.log("");
    }

    log(...messages: any[]) {
        const message = messages.join(" ");
        console.log(message);
        this.buffer.push(message);
    }

    debug(category: string, message: string, data?: any) {
        if (!this.debugEnabled) return;

        const formattedMessage = data
            ? `[DEBUG] ${category.padEnd(20)} ${message}: ${JSON.stringify(data)}`
            : `[DEBUG] ${category.padEnd(20)} ${message}`;

        console.log(formattedMessage);
        this.buffer.push(formattedMessage);
    }

    section(title: string) {
        this.log("\n----------------------------------------");
        this.log(title);
        this.log("");
    }

    matrix(name: string, data: number[][]) {
        this.log(`${name}:`);
        data.forEach((row) => {
            this.log("  " + row.map((x) => x.toFixed(2)).join("\t"));
        });
        this.log("");
    }

    save() {
        fs.writeFileSync(this.logFile, this.buffer.join("\n"));
    }
}

function toNumberArray(
    arr: MathNumericType[] | MathNumericType[][] | MathNumericType,
): number[] {
    if (!Array.isArray(arr)) {
        return [Number(arr)];
    }
    return arr.flat().map((x) => Number(x));
}

function validateModel(model: GenerativeModel) {
    // Validate observation model A
    if (model.A.size()[0] !== 2 || model.A.size()[1] !== 2) {
        throw new Error("Observation model A must be 2x2");
    }

    // Validate state transition models B
    if (model.B.length !== 2) {
        throw new Error("Must have exactly 2 state transition matrices");
    }
    for (const B of model.B) {
        if (B.size()[0] !== 2 || B.size()[1] !== 2) {
            throw new Error("Each state transition matrix must be 2x2");
        }
    }

    // Validate prior preferences C
    if (model.C.size()[0] !== 2 || model.C.size()[1] !== 1) {
        throw new Error("Prior preferences C must be 2x1");
    }

    // Validate initial state prior D
    if (model.D.size()[0] !== 2 || model.D.size()[1] !== 1) {
        throw new Error("Initial state prior D must be 2x1");
    }
}

function interpretState(beliefs: number[]): string {
    const safeProb = beliefs[0];
    const dangerProb = beliefs[1];

    if (safeProb > 0.9) return "Very confident in SAFE state";
    if (dangerProb > 0.9) return "Very confident in DANGEROUS state";
    if (safeProb > 0.7) return "Moderately confident in SAFE state";
    if (dangerProb > 0.7) return "Moderately confident in DANGEROUS state";
    return "Uncertain about state";
}

function saveModelDescription(model: GenerativeModel, logger: Logger) {
    logger.section("Model Parameters");

    // Log observation model
    logger.log("Observation Model (A):");
    logger.log("P(observation | state) =");
    const A = model.A.toArray() as number[][];
    logger.matrix("State-Observation Mapping", A);

    // Log state transition models
    logger.log("State Transition Model (B):");
    logger.log("Action 0 (Stay/Observe):");
    const B0 = model.B[0].toArray() as number[][];
    logger.matrix("Stay/Observe Transitions", B0);

    logger.log("Action 1 (Move/Change):");
    const B1 = model.B[1].toArray() as number[][];
    logger.matrix("Move/Change Transitions", B1);

    // Log preferences and priors
    logger.log("Prior Preferences (C):");
    const C = model.C.toArray() as number[][];
    logger.matrix("State Preferences", C);

    logger.log("Initial State Prior (D):");
    const D = model.D.toArray() as number[][];
    logger.matrix("Initial Beliefs", D);
}

function saveBeliefHistory(history: number[][], filename: string) {
    const data = history
        .map((beliefs, i) => {
            return `${i},${beliefs[0]},${beliefs[1]}`;
        })
        .join("\n");

    const header = "Iteration,Safe_Belief,Danger_Belief\n";
    fs.writeFileSync(filename, header + data);
}

async function runStandaloneExample() {
    // Simulation parameters
    const NUM_TIMESTEPS = 20;
    const SWITCH_PATTERN = 5;

    // Create output directory if it doesn't exist
    const outputDir = path.join(__dirname, "../../Output");
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir);
    }

    // Initialize logger and visualizer
    const logger = new Logger(path.join(outputDir, "inference_log.txt"), true);
    const visualizer = new InferenceVisualizer(outputDir);

    logger.section("Starting Active Inference Example");
    logger.log(`Running simulation for ${NUM_TIMESTEPS} timesteps`);
    logger.log("");

    logger.log("Model Description:");
    logger.log("- Two possible states: SAFE (0) and DANGEROUS (1)");
    logger.log(
        "- Two possible observations: SAFE signal (0) and DANGER signal (1)",
    );
    logger.log("- Two possible actions: STAY/OBSERVE (0) and MOVE/CHANGE (1)");
    logger.log("");

    // Create model and save description
    const model: GenerativeModel = {
        A: matrix([
            [0.8, 0.2],
            [0.2, 0.8],
        ]),
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
        C: matrix([[0.8], [0.2]]),
        D: matrix([[0.5], [0.5]]),
    };

    saveModelDescription(model, logger);
    validateModel(model);

    // Configure inference parameters
    const config: InferenceConfig = {
        alpha: 2.0,
        beta: 1.0,
        iterations: 5,
    };

    logger.section("Model Configuration");
    logger.log("- Action precision:", config.alpha);
    logger.log("- State transition noise:", config.beta);
    logger.log("- Belief update iterations:", config.iterations);
    logger.log("");

    // Create inference engine
    const engine = new ActiveInference(model, config, true);

    // Generate observations
    const observations: ObservationData[] = Array(NUM_TIMESTEPS)
        .fill(null)
        .map((_, t) => ({
            o: Math.floor(t / SWITCH_PATTERN) % 2,
            t: t,
        }));

    logger.section("Running Inference");
    const timeStepData: TimeStepData[] = [];

    for (const [t, obs] of observations.entries()) {
        logger.section(
            `Timestep ${t}: ${obs.o === 0 ? "SAFE" : "DANGER"} signal`,
        );

        const action = engine.selectAction(obs);
        const beliefs = toNumberArray(action.Q.toArray());

        // Store results for visualization
        timeStepData.push({
            timestep: t,
            observation: obs.o === 0 ? "SAFE" : "DANGER",
            beliefs,
            action: action.action,
            G: action.G,
        });

        // Log perception results
        logger.log("Perception Results:");
        logger.log(`- State interpretation: ${interpretState(beliefs)}`);
        logger.log(
            `- Belief distribution: Safe=${(beliefs[0] * 100).toFixed(1)}%, Dangerous=${(beliefs[1] * 100).toFixed(1)}%`,
        );
        logger.log("");

        // Log action selection results
        logger.log("Action Selection Results:");
        logger.log(
            `- Selected action: ${action.action === 0 ? "STAY/OBSERVE" : "MOVE/CHANGE"}`,
        );
        logger.log(
            `- Expected free energies: [Stay=${Number(action.G[0]).toFixed(3)}, Move=${Number(action.G[1]).toFixed(3)}]`,
        );
        logger.log("");
    }

    // Save visualization data
    visualizer.saveBeliefEvolution(timeStepData);
    visualizer.saveExpectedFreeEnergies(timeStepData);
    visualizer.generatePlotScript();
    visualizer.generateHTML();

    logger.section("Example Completed");
    logger.log("Results have been saved to the Output directory:");
    logger.log("- Full log: inference_log.txt");
    logger.log("- Belief evolution data: belief_evolution.csv");
    logger.log("- Expected free energies data: expected_free_energies.csv");
    logger.log("- Visualization script: plot_results.py");
    logger.log("- Results visualization: results.html");
    logger.log("");

    // Save the log
    logger.save();
}

// Ensure Output directory exists
if (!existsSync("Output")) {
    mkdirSync("Output");
}

// Run the example
runStandaloneExample();

// Generate visualizations
console.log("Generating visualizations...");
execSync("python3 Output/plot_results.py");
console.log("Visualizations generated successfully!");
