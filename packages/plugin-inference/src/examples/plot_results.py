import matplotlib
matplotlib.use('Agg')  # Use non-GUI backend
import matplotlib.pyplot as plt
import pandas as pd

# Read data
belief_data = pd.read_csv('Output/belief_evolution.csv')
efe_data = pd.read_csv('Output/expected_free_energies.csv')

# Create figure with two subplots
fig, (ax1, ax2) = plt.subplots(2, 1, figsize=(10, 8))

# Plot belief evolution
ax1.plot(belief_data['timestep'], belief_data['safe'], label='Safe', color='green')
ax1.plot(belief_data['timestep'], belief_data['dangerous'], label='Dangerous', color='red')
ax1.set_title('Belief Evolution Over Time')
ax1.set_xlabel('Timestep')
ax1.set_ylabel('Belief Probability')
ax1.legend()
ax1.grid(True)

# Plot expected free energies
ax2.plot(efe_data['timestep'], efe_data['stay'], label='Stay/Observe', color='blue')
ax2.plot(efe_data['timestep'], efe_data['move'], label='Move/Change', color='orange')
ax2.set_title('Expected Free Energy Over Time')
ax2.set_xlabel('Timestep')
ax2.set_ylabel('Expected Free Energy')
ax2.legend()
ax2.grid(True)

# Adjust layout and save
plt.tight_layout()
plt.savefig('Output/results.png')

# Generate HTML report
with open('Output/results.html', 'w') as f:
    f.write(f'''
    <html>
    <head>
        <title>Active Inference Results</title>
        <style>
            body {{ font-family: Arial, sans-serif; margin: 20px; }}
            img {{ max-width: 100%; }}
        </style>
    </head>
    <body>
        <h1>Active Inference Results</h1>
        <p>Generated at: {pd.Timestamp.now()}</p>
        <img src="results.png" alt="Results visualization">
    </body>
    </html>
    ''')