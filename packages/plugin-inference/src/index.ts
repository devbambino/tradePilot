import { Plugin, PluginContext } from "@elizaos/core";
import { ActiveInference } from "./inference";
import {
    GenerativeModel,
    InferenceConfig,
    ActionPolicy,
    ObservationData,
} from "./types";

export class InferencePlugin implements Plugin {
    private context: PluginContext;
    private inferenceEngines: Map<string, ActiveInference> = new Map();

    constructor() {}

    async init(context: PluginContext): Promise<void> {
        this.context = context;
    }

    /**
     * Create a new inference engine instance for an agent
     */
    async createInferenceEngine(
        agentId: string,
        model: GenerativeModel,
        config: InferenceConfig
    ): Promise<void> {
        const engine = new ActiveInference(model, config);
        this.inferenceEngines.set(agentId, engine);
    }

    /**
     * Get action recommendation for an agent based on current observations
     */
    async getAction(
        agentId: string,
        observation: ObservationData
    ): Promise<ActionPolicy> {
        const engine = this.inferenceEngines.get(agentId);
        if (!engine) {
            throw new Error(`No inference engine found for agent ${agentId}`);
        }
        return engine.selectAction(observation);
    }

    /**
     * Delete an inference engine instance
     */
    async deleteInferenceEngine(agentId: string): Promise<void> {
        this.inferenceEngines.delete(agentId);
    }
}

// Plugin factory function
export function createPlugin(): Plugin {
    return new InferencePlugin();
}
