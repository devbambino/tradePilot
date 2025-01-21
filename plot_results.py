import pandas as pd
import matplotlib.pyplot as plt

# Read the data
belief_evolution = pd.read_csv('belief_evolution.csv')
expected_free_energies = pd.read_csv('expected_free_energies.csv')

# Set the style
plt.style.use('default')

# Create a figure with two subplots
fig, (ax1, ax2) = plt.subplots(2, 1, figsize=(10, 12))

# Plot belief evolution
ax1.plot(belief_evolution['timestep'], belief_evolution['P(Safe)'], label='P(Safe)', marker='o')
ax1.plot(belief_evolution['timestep'], belief_evolution['P(Dangerous)'], label='P(Dangerous)', marker='o')
ax1.set_title('Belief Evolution Over Time')
ax1.set_xlabel('Timestep')
ax1.set_ylabel('Probability')
ax1.grid(True)
ax1.legend()

# Plot expected free energies
ax2.plot(expected_free_energies['timestep'], expected_free_energies['Stay/Observe'], label='Stay/Observe', marker='s')
ax2.plot(expected_free_energies['timestep'], expected_free_energies['Move/Change'], label='Move/Change', marker='s')
ax2.set_title('Expected Free Energy for Actions')
ax2.set_xlabel('Timestep')
ax2.set_ylabel('Expected Free Energy')
ax2.grid(True)
ax2.legend()

# Adjust layout and save
plt.tight_layout()
plt.savefig('results.png')

# Generate HTML
with open('results.html', 'w') as f:
    f.write(f"""
    <!DOCTYPE html>
    <html>
    <head>
        <title>Active Inference Results</title>
        <style>
            body {{ font-family: Arial, sans-serif; margin: 40px; }}
            h1 {{ color: #333; }}
            img {{ max-width: 100%; height: auto; }}
            .timestamp {{ color: #666; font-size: 0.9em; }}
        </style>
    </head>
    <body>
        <h1>Active Inference Results</h1>
        <p class="timestamp">Generated at: {pd.Timestamp.now()}</p>
        <img src="results.png" alt="Results visualization">
    </body>
    </html>
    """)