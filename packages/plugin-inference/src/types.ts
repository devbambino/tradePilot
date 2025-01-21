import { Matrix } from "mathjs";

export interface GenerativeModel {
    // Prior preferences over outcomes
    C: Matrix;
    // State transition probabilities (dynamics)
    B: Matrix[];
    // Observation model (likelihood mapping)
    A: Matrix;
    // Prior beliefs about initial states
    D: Matrix;
}

export interface BeliefState {
    // Posterior beliefs about hidden states
    states: Matrix;
    // Expected free energy for each action
    G: Matrix;
    // Action probabilities
    pi: Matrix;
}

export interface ObservationData {
    o: number; // Single observation value (0 or 1)
    t: number; // Timestep
}

export interface InferenceConfig {
    // Action precision (exploration-exploitation tradeoff)
    alpha: number;
    // State transition noise
    beta: number;
    // Number of iterations for belief updating
    iterations: number;
}

export interface ActionPolicy {
    // Selected action index
    action: number;
    // Expected free energy for each action
    G: number[];
    // Posterior beliefs about states
    Q: Matrix;
}
