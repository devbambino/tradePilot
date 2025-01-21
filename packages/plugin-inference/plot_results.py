import pandas as pd
import matplotlib.pyplot as plt

# Read the data
belief_data = pd.read_csv('Output/belief_evolution.csv')
efe_data = pd.read_csv('Output/expected_free_energies.csv')

# Create figure with two subplots
fig, (ax1, ax2) = plt.subplots(2, 1, figsize=(10, 8))

# Plot belief evolution
ax1.plot(belief_data['Iteration'], belief_data['Safe_Belief'], label='Safe', color='green')
ax1.plot(belief_data['Iteration'], belief_data['Danger_Belief'], label='Dangerous', color='red')
ax1.set_title('Belief Evolution Over Time')
ax1.set_xlabel('Timestep')
ax1.set_ylabel('Belief Probability')
ax1.legend()
ax1.grid(True)

# Plot expected free energies
ax2.plot(efe_data['Timestep'], efe_data['Stay_EFE'], label='Stay/Observe', color='blue')
ax2.plot(efe_data['Timestep'], efe_data['Move_EFE'], label='Move/Change', color='orange')
ax2.set_title('Expected Free Energy for Actions')
ax2.set_xlabel('Timestep')
ax2.set_ylabel('Expected Free Energy')
ax2.legend()
ax2.grid(True)

# Adjust layout and save
plt.tight_layout()
plt.savefig('Output/results.png')

# Generate HTML report
with open('Output/results.html', 'w') as f:
    f.write(f"""
    <html>
    <head>
        <title>Active Inference Results</title>
        <style>
            body {{ font-family: Arial, sans-serif; margin: 20px; }}
            h1 {{ color: #333; }}
            img {{ max-width: 100%; }}
            .timestamp {{ color: #666; }}
        </style>
    </head>
    <body>
        <h1>Active Inference Results</h1>
        <p class="timestamp">Generated at: {pd.Timestamp.now().strftime('%Y-%m-%d %H:%M:%S')}</p>
        <img src="results.png" alt="Results visualization">
    </body>
    </html>
    """)
