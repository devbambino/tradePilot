import * as fs from "fs";
import * as path from "path";

export interface TimeStepData {
    timestep: number;
    observation: string;
    beliefs: number[];
    action: number;
    G: number[];
}

export class InferenceVisualizer {
    private outputDir: string;

    constructor(outputDir: string) {
        this.outputDir = outputDir;
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir);
        }
    }

    saveBeliefEvolution(data: TimeStepData[]) {
        const csvData = data
            .map(
                (d) =>
                    `${d.timestep},${d.observation},${d.beliefs[0]},${d.beliefs[1]},${d.action}`,
            )
            .join("\n");

        const header =
            "Timestep,Observation,Safe_Belief,Danger_Belief,Action\n";
        fs.writeFileSync(
            path.join(this.outputDir, "belief_evolution.csv"),
            header + csvData,
        );
    }

    saveExpectedFreeEnergies(data: TimeStepData[]) {
        const csvData = data
            .map((d) => `${d.timestep},${d.observation},${d.G[0]},${d.G[1]}`)
            .join("\n");

        const header = "Timestep,Observation,G_Stay,G_Move\n";
        fs.writeFileSync(
            path.join(this.outputDir, "expected_free_energies.csv"),
            header + csvData,
        );
    }

    generatePlotScript() {
        const scriptContent = `import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import pandas as pd
import numpy as np

# Set global style parameters
plt.style.use('default')
plt.rcParams['figure.figsize'] = [10, 6]
plt.rcParams['font.size'] = 12
plt.rcParams['axes.grid'] = True
plt.rcParams['grid.alpha'] = 0.3

def plot_belief_evolution():
    """Plot the evolution of beliefs over time with observation markers."""
    data = pd.read_csv('Output/belief_evolution.csv')

    fig, ax = plt.subplots()

    # Plot beliefs
    ax.plot(data['Timestep'], data['Safe_Belief'], 'b-', label='Safe State', linewidth=2)
    ax.plot(data['Timestep'], data['Danger_Belief'], 'r-', label='Dangerous State', linewidth=2)

    # Add observation markers
    safe_obs = data[data['Observation'] == 'SAFE']['Timestep']
    danger_obs = data[data['Observation'] == 'DANGER']['Timestep']

    ax.scatter(safe_obs, [1.05] * len(safe_obs), marker='v', c='g', label='Safe Signal', alpha=0.5)
    ax.scatter(danger_obs, [1.05] * len(danger_obs), marker='v', c='r', label='Danger Signal', alpha=0.5)

    ax.set_xlabel('Timestep')
    ax.set_ylabel('Belief Probability')
    ax.set_title('Evolution of State Beliefs Over Time')
    ax.set_ylim([-0.05, 1.1])
    ax.legend(loc='center left', bbox_to_anchor=(1, 0.5))
    ax.grid(True, alpha=0.3)

    plt.tight_layout()
    plt.savefig('Output/belief_evolution.png', dpi=300, bbox_inches='tight')
    plt.close()

def plot_expected_free_energies():
    """Plot the expected free energies for each action over time."""
    data = pd.read_csv('Output/expected_free_energies.csv')

    fig, ax = plt.subplots()

    # Plot expected free energies
    ax.plot(data['Timestep'], data['G_Stay'], 'b-', label='Stay/Observe', linewidth=2)
    ax.plot(data['Timestep'], data['G_Move'], 'r-', label='Move/Change', linewidth=2)

    # Add observation markers
    safe_obs = data[data['Observation'] == 'SAFE']['Timestep']
    danger_obs = data[data['Observation'] == 'DANGER']['Timestep']

    ax.scatter(safe_obs, [data['G_Stay'].max() * 1.05] * len(safe_obs),
              marker='v', c='g', label='Safe Signal', alpha=0.5)
    ax.scatter(danger_obs, [data['G_Stay'].max() * 1.05] * len(danger_obs),
              marker='v', c='r', label='Danger Signal', alpha=0.5)

    ax.set_xlabel('Timestep')
    ax.set_ylabel('Expected Free Energy')
    ax.set_title('Expected Free Energies for Actions Over Time')
    ax.legend(loc='center left', bbox_to_anchor=(1, 0.5))
    ax.grid(True, alpha=0.3)

    plt.tight_layout()
    plt.savefig('Output/expected_free_energies.png', dpi=300, bbox_inches='tight')
    plt.close()

def plot_state_transitions():
    """Plot the state transition matrices for each action."""
    # Define transition matrices (from the model)
    stay_transitions = np.array([
        [0.9, 0.1],
        [0.1, 0.9]
    ])

    move_transitions = np.array([
        [0.5, 0.5],
        [0.5, 0.5]
    ])

    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(12, 5))

    # Plot Stay/Observe transitions
    im1 = ax1.imshow(stay_transitions, cmap='RdYlBu', vmin=0, vmax=1)
    ax1.set_title('Stay/Observe Transitions')
    ax1.set_xticks([0, 1])
    ax1.set_yticks([0, 1])
    ax1.set_xticklabels(['Safe', 'Dangerous'])
    ax1.set_yticklabels(['Safe', 'Dangerous'])
    ax1.set_xlabel('To State')
    ax1.set_ylabel('From State')

    # Add colorbar
    plt.colorbar(im1, ax=ax1, label='Transition Probability')

    # Add text annotations
    for i in range(2):
        for j in range(2):
            ax1.text(j, i, f'{stay_transitions[i, j]:.2f}',
                    ha='center', va='center', color='black')

    # Plot Move/Change transitions
    im2 = ax2.imshow(move_transitions, cmap='RdYlBu', vmin=0, vmax=1)
    ax2.set_title('Move/Change Transitions')
    ax2.set_xticks([0, 1])
    ax2.set_yticks([0, 1])
    ax2.set_xticklabels(['Safe', 'Dangerous'])
    ax2.set_yticklabels(['Safe', 'Dangerous'])
    ax2.set_xlabel('To State')
    ax2.set_ylabel('From State')

    # Add colorbar
    plt.colorbar(im2, ax=ax2, label='Transition Probability')

    # Add text annotations
    for i in range(2):
        for j in range(2):
            ax2.text(j, i, f'{move_transitions[i, j]:.2f}',
                    ha='center', va='center', color='black')

    plt.tight_layout()
    plt.savefig('Output/state_transitions.png', dpi=300, bbox_inches='tight')
    plt.close()

def generate_html():
    """Generate an HTML report with all visualizations and explanations."""
    html_content = """
    <!DOCTYPE html>
    <html>
    <head>
        <title>Active Inference Results</title>
        <style>
            body { font-family: Arial, sans-serif; max-width: 1200px; margin: 0 auto; padding: 20px; }
            h1, h2 { color: #333; }
            .section { margin: 30px 0; }
            .plot { margin: 20px 0; text-align: center; }
            .plot img { max-width: 100%; height: auto; }
            .description { margin: 20px 0; line-height: 1.6; }
        </style>
    </head>
    <body>
        <h1>Active Inference Analysis Results</h1>

        <div class="section">
            <h2>Model Architecture</h2>
            <div class="description">
                <p>The model represents a two-state world (Safe/Dangerous) with two possible observations
                (Safe/Danger signals) and two available actions (Stay/Move). The state transitions
                visualization below shows how different actions affect the probability of state changes.</p>
            </div>
            <div class="plot">
                <img src="state_transitions.png" alt="State Transitions">
                <p><em>State transition probabilities for each action. The color intensity represents
                the probability of transitioning from one state to another.</em></p>
            </div>
        </div>

        <div class="section">
            <h2>Belief Evolution</h2>
            <div class="description">
                <p>This plot shows how the agent's beliefs about the current state evolve over time.
                The markers at the top indicate the actual observations received at each timestep.</p>
            </div>
            <div class="plot">
                <img src="belief_evolution.png" alt="Belief Evolution">
                <p><em>Evolution of beliefs over time. Blue line represents belief in Safe state,
                red line represents belief in Dangerous state. Markers indicate observations.</em></p>
            </div>
        </div>

        <div class="section">
            <h2>Expected Free Energies</h2>
            <div class="description">
                <p>The expected free energy represents the anticipated uncertainty and risk associated
                with each action. Lower values indicate more preferred actions. The agent selects
                actions that minimize expected free energy.</p>
            </div>
            <div class="plot">
                <img src="expected_free_energies.png" alt="Expected Free Energies">
                <p><em>Expected free energies for each action over time. Lower values indicate
                preferred actions. Markers show actual observations received.</em></p>
            </div>
        </div>
    </body>
    </html>
    """

    with open('Output/results.html', 'w') as f:
        f.write(html_content)

if __name__ == '__main__':
    # Generate all visualizations
    plot_belief_evolution()
    plot_expected_free_energies()
    plot_state_transitions()
    generate_html()
    print("Visualizations generated successfully!")`;

        fs.writeFileSync(
            path.join(this.outputDir, "plot_results.py"),
            scriptContent,
        );
    }

    generateHTML() {
        const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Active Inference Results</title>
            <style>
                body { font-family: Arial, sans-serif; max-width: 1200px; margin: 0 auto; padding: 20px; }
                h1, h2 { color: #333; }
                .section { margin: 30px 0; }
                .plot { margin: 20px 0; text-align: center; }
                .plot img { max-width: 100%; height: auto; }
                .description { margin: 20px 0; line-height: 1.6; }
            </style>
        </head>
        <body>
            <h1>Active Inference Analysis Results</h1>

            <div class="section">
                <h2>Model Architecture</h2>
                <div class="description">
                    <p>The model represents a two-state world (Safe/Dangerous) with two possible observations
                    (Safe/Danger signals) and two available actions (Stay/Move). The state transitions
                    visualization below shows how different actions affect the probability of state changes.</p>
                </div>
                <div class="plot">
                    <img src="state_transitions.png" alt="State Transitions">
                    <p><em>State transition probabilities for each action. The color intensity represents
                    the probability of transitioning from one state to another.</em></p>
                </div>
            </div>

            <div class="section">
                <h2>Belief Evolution</h2>
                <div class="description">
                    <p>This plot shows how the agent's beliefs about the current state evolve over time.
                    The markers at the top indicate the actual observations received at each timestep.</p>
                </div>
                <div class="plot">
                    <img src="belief_evolution.png" alt="Belief Evolution">
                    <p><em>Evolution of beliefs over time. Blue line represents belief in Safe state,
                    red line represents belief in Dangerous state. Markers indicate observations.</em></p>
                </div>
            </div>

            <div class="section">
                <h2>Expected Free Energies</h2>
                <div class="description">
                    <p>The expected free energy represents the anticipated uncertainty and risk associated
                    with each action. Lower values indicate more preferred actions. The agent selects
                    actions that minimize expected free energy.</p>
                </div>
                <div class="plot">
                    <img src="expected_free_energies.png" alt="Expected Free Energies">
                    <p><em>Expected free energies for each action over time. Lower values indicate
                    preferred actions. Markers show actual observations received.</em></p>
                </div>
            </div>
        </body>
        </html>`;

        fs.writeFileSync(
            path.join(this.outputDir, "results.html"),
            htmlContent,
        );
    }
}
