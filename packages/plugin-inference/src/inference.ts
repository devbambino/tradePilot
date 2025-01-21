import {
    Matrix,
    matrix,
    multiply as matMul,
    transpose,
    exp as mathExp,
    log as mathLog,
    sum as mathSum,
    zeros,
    subset,
    index,
    MathType,
    number as mathNumber,
    BigNumber,
    MathCollection,
    map,
    dotMultiply,
    dotDivide,
    reshape,
    MathNumericType,
    create,
    all,
    add,
} from "mathjs";
import {
    GenerativeModel,
    BeliefState,
    ObservationData,
    InferenceConfig,
    ActionPolicy,
} from "./types";

const math = create(all);

export class ActiveInference {
    private model: GenerativeModel;
    private config: InferenceConfig;
    private debug: boolean;

    constructor(
        model: GenerativeModel,
        config: InferenceConfig,
        debug = false,
    ) {
        this.model = model;
        this.config = config;
        this.debug = debug;
    }

    private log(msg: string, ...args: any[]) {
        if (this.debug) {
            console.log(`[DEBUG] ${msg}`, ...args);
        }
    }

    private toScalar(m: Matrix | MathType | BigNumber): number {
        if (typeof m === "number") return m;
        if ("toNumber" in m) return m.toNumber();
        const arr = (m as Matrix).toArray();
        return Array.isArray(arr) ? Number(arr[0]) : Number(arr);
    }

    private toMatrix(m: Matrix | number | MathCollection): Matrix {
        if (m instanceof Matrix) return m;
        return matrix(typeof m === "number" ? [[m]] : m);
    }

    private matrixExp(m: Matrix): Matrix {
        return map(m, (x) => mathExp(Number(x))) as Matrix;
    }

    private matrixLog(m: Matrix): Matrix {
        return map(m, (x) => mathLog(Math.max(Number(x), 1e-10))) as Matrix;
    }

    private matrixSum(m: Matrix): number {
        return this.toScalar(mathSum(m));
    }

    private elementWiseMultiply(a: Matrix, b: Matrix): Matrix {
        this.log("Element-wise multiply dimensions:", a.size(), b.size());
        return dotMultiply(a, b) as Matrix;
    }

    private toNumber(x: any): number {
        return typeof x === "number" ? x : Number(x);
    }

    /**
     * Update beliefs about hidden states using variational inference
     * Q represents the belief distribution over states (e.g. [P(Safe), P(Dangerous)])
     * This implements the perception step by minimizing variational free energy
     */
    private updateBeliefs(obs: ObservationData): BeliefState {
        const { A, B, D } = this.model;
        const { iterations, beta } = this.config;

        this.log("Model dimensions:");
        this.log("- A:", A.size());
        this.log("- B[0]:", B[0].size());
        this.log("- D:", D.size());

        // Initialize beliefs with prior
        let Q = matrix(D);
        this.log("Initial Q:", Q.size());

        // Iterative belief updating to minimize variational free energy
        for (let i = 0; i < iterations; i++) {
            try {
                // Create observation vector as a 2x1 matrix with one-hot encoding
                const obsVector = matrix([
                    [obs.o === 0 ? 1 : 0],
                    [obs.o === 1 ? 1 : 0],
                ]);
                this.log("Observation vector:", obsVector.size());

                // Calculate log likelihood using observation model A
                const logLike = matMul(A, obsVector) as Matrix;
                this.log("Log likelihood:", logLike.size());

                // Scale likelihood by beta and calculate exponential term
                const betaScaled = map(
                    logLike,
                    (x) => mathNumber(x) * beta,
                ) as Matrix;
                const expTerm = map(betaScaled, (x) =>
                    mathExp(mathNumber(x)),
                ) as Matrix;
                this.log("Exp term size:", expTerm.size());

                // Update beliefs using element-wise multiplication
                const updatedQ = map(expTerm, (x, idx) => {
                    const qVal = Q.get([idx[0], 0]); // Get value at correct index
                    return mathNumber(x) * mathNumber(qVal);
                }) as Matrix;

                // Normalize beliefs
                const sum = this.matrixSum(updatedQ);
                const normalizedQ = map(
                    updatedQ,
                    (x) => mathNumber(x) / (sum || 1),
                ) as Matrix;
                this.log("Normalized Q:", normalizedQ.size());

                Q = normalizedQ;
            } catch (error) {
                console.error("Error in belief update:", error);
                // Reset to uniform distribution on error
                Q = matrix([[0.5], [0.5]]);
            }
        }

        // Calculate expected free energy for each action
        const G = this.calculateExpectedFreeEnergy(Q);
        this.log("Expected free energy G:", G.size());

        // Calculate policy
        const pi = this.calculatePolicy(G);
        this.log("Policy pi:", pi.size());

        return {
            states: Q,
            G: matrix(G),
            pi,
        };
    }

    /**
     * Calculate expected free energy for action selection
     * This evaluates how good each action would be in terms of:
     * 1. Ambiguity (information gain about hidden states)
     * 2. Risk (divergence from preferred outcomes)
     *
     * Higher values are better:
     * - Higher entropy means more information gain
     * - Higher utility means closer to preferences
     */
    private calculateExpectedFreeEnergy(Q: Matrix): Matrix {
        const { A, B, C } = this.model;
        const { alpha } = this.config;

        this.log("Calculate EFE - Input Q:", Q.size());
        this.log("Calculate EFE - Model C:", C.size());

        // Initialize G for each action
        const G = zeros(2, 1) as Matrix;
        const values: number[] = [];

        // Calculate EFE for each action
        for (let a = 0; a < 2; a++) {
            try {
                // Predict next state distribution after action
                const Qnext = matMul(B[a], Q) as Matrix;

                // Expected observations under predicted state
                const Qo = matMul(A, Qnext) as Matrix;
                this.log(`Action ${a} - Expected observations Qo:`, Qo.size());

                // Ambiguity term (uncertainty about outcomes)
                const logQo = map(Qo, (x) =>
                    mathNumber(mathLog(Math.max(Number(x), 1e-10))),
                ) as Matrix;
                this.log(`Action ${a} - Log Qo:`, logQo.size());

                const QoLogQo = this.elementWiseMultiply(Qo, logQo);
                this.log(`Action ${a} - Qo * log(Qo):`, QoLogQo.size());

                const H = -this.matrixSum(QoLogQo); // Negative entropy (information gain)
                this.log(`Action ${a} - Entropy H:`, H);

                // Risk term (divergence from preferred outcomes)
                const QoC = this.elementWiseMultiply(Qo, C);
                this.log(`Action ${a} - Qo * C:`, QoC.size());

                const utility = this.matrixSum(QoC); // Positive utility (preference satisfaction)
                this.log(`Action ${a} - Utility:`, utility);

                // Combine terms for this action
                const value = alpha * (H + utility);
                this.log(`Action ${a} - Combined value:`, value);
                values.push(value);
            } catch (error) {
                console.error(`Error calculating EFE for action ${a}:`, error);
                values.push(0); // Default to neutral value on error
            }
        }

        // Return as 2x1 matrix
        return matrix([[values[0]], [values[1]]]);
    }

    /**
     * Calculate action policy using softmax over expected free energy
     */
    private calculatePolicy(G: Matrix): Matrix {
        const { alpha } = this.config;

        this.log("Calculate policy - Input G:", G.size());

        try {
            // Softmax function
            const scaledG = map(G, (x) =>
                mathNumber(alpha * Number(x)),
            ) as Matrix;
            const pi = map(scaledG, (x) =>
                mathNumber(mathExp(Number(x))),
            ) as Matrix;
            this.log("Policy before normalization:", pi.size());

            const sumPi = this.matrixSum(pi);
            if (sumPi > 0) {
                return map(pi, (x) => mathNumber(Number(x) / sumPi)) as Matrix;
            }
            return pi;
        } catch (error) {
            console.error("Error calculating policy:", error);
            // Return uniform policy on error
            return matrix([[0.5], [0.5]]);
        }
    }

    /**
     * Select action based on current beliefs and expected free energy
     */
    public selectAction(obs: ObservationData): ActionPolicy {
        // Update beliefs through perception (minimizing variational free energy)
        const beliefs = this.updateBeliefs(obs);

        // Select action with highest expected free energy
        const G = beliefs.G.toArray() as number[];
        const actionIndex = G.indexOf(Math.max(...G));

        return {
            action: actionIndex,
            G,
            Q: beliefs.states,
        };
    }

    private calculateLogLikelihood(obsVector: Matrix): Matrix {
        // Calculate likelihood using the observation model A
        return matMul(transpose(this.model.A), obsVector) as Matrix;
    }
}
