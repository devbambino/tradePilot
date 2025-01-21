# ElizaOS Active Inference Plugin

This plugin implements Active Inference for ElizaOS agents, enabling them to perform sophisticated perception, learning, and decision-making using the free energy principle.

## Overview

Active Inference is a unified theory of brain function that casts perception, learning, and decision-making as processes of free energy minimization. This plugin provides a TypeScript implementation of Active Inference that can be used by ElizaOS agents for:

-   Perception: Inferring hidden states from observations
-   Learning: Updating internal models based on experience
-   Decision-making: Selecting actions that minimize expected free energy

## Installation

```bash
pnpm add @elizaos/plugin-inference
```

## Usage

```typescript
import { InferencePlugin } from "@elizaos/plugin-inference";

// Create plugin instance
const plugin = new InferencePlugin();

// Initialize generative model
const model = {
    // Prior preferences over outcomes
    C: matrix([0.8, 0.2]),
    // State transition probabilities
    B: [
        matrix([
            [0.9, 0.1],
            [0.1, 0.9],
        ]),
    ],
    // Observation model
    A: matrix([
        [0.9, 0.1],
        [0.1, 0.9],
    ]),
    // Initial state prior
    D: matrix([0.5, 0.5]),
};

// Configure inference parameters
const config = {
    T: 5, // Planning horizon
    alpha: 1.0, // Action precision
    beta: 1.0, // State transition noise
    iterations: 10, // Belief update iterations
};

// Create inference engine for an agent
await plugin.createInferenceEngine("agent1", model, config);

// Get action recommendation based on observation
const action = await plugin.getAction("agent1", {
    o: [1], // Observed outcome
    t: 0, // Time step
});

// Clean up when done
await plugin.deleteInferenceEngine("agent1");
```

## API Reference

### InferencePlugin

The main plugin class that manages Active Inference engines for agents.

#### Methods

-   `init(context: PluginContext): Promise<void>`
    Initialize the plugin with ElizaOS context

-   `createInferenceEngine(agentId: string, model: GenerativeModel, config: InferenceConfig): Promise<void>`
    Create a new inference engine instance for an agent

-   `getAction(agentId: string, observation: ObservationData): Promise<ActionPolicy>`
    Get action recommendation based on current observation

-   `deleteInferenceEngine(agentId: string): Promise<void>`
    Delete an inference engine instance

### Types

#### GenerativeModel

```typescript
interface GenerativeModel {
    C: Matrix; // Prior preferences over outcomes
    B: Matrix[]; // State transition probabilities
    A: Matrix; // Observation model
    D: Matrix; // Initial state prior
}
```

#### InferenceConfig

```typescript
interface InferenceConfig {
    T: number; // Planning horizon
    alpha: number; // Action precision
    beta: number; // State transition noise
    iterations: number; // Belief update iterations
}
```

#### ObservationData

```typescript
interface ObservationData {
    o: number[]; // Observed outcomes
    t: number; // Time point
}
```

#### ActionPolicy

```typescript
interface ActionPolicy {
    action: number; // Selected action index
    G: number[]; // Expected free energy for each policy
    Q: Matrix; // Posterior beliefs about states
}
```

## Contributing

Contributions are welcome! Please read our [Contributing Guide](../../CONTRIBUTING.md) for details on our code of conduct and the process for submitting pull requests.

## License

This project is licensed under the MIT License - see the [LICENSE](../../LICENSE) file for details.
