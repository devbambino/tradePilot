import { EventHandler } from './events'; // Import the EventHandler class
import { WebClient } from '@slack/web-api';
import { MessageManager } from './messages';
import { IAgentRuntime } from '@ai16z/eliza';
import { GitHubClientInterface } from '@ai16z/client-github';

// Function to handle Slack events
export async function handleSlackEvents(event: any, runtime: IAgentRuntime) {
    // Instantiate the EventHandler with the necessary configuration and client
    const slackConfig = {
        appId: process.env.SLACK_APP_ID,
        clientId: process.env.SLACK_CLIENT_ID,
        clientSecret: process.env.SLACK_CLIENT_SECRET,
        signingSecret: process.env.SLACK_SIGNING_SECRET,
        verificationToken: process.env.SLACK_VERIFICATION_TOKEN,
        botToken: process.env.SLACK_BOT_TOKEN,
        botId: process.env.SLACK_BOT_ID
    };
    const slackClient = new WebClient(process.env.SLACK_API_TOKEN);
    const messageManager = new MessageManager(slackClient, runtime, slackConfig.botId);

    // Create event handler - it will automatically set up event listeners
    const eventHandler = new EventHandler(slackConfig, slackClient, messageManager);

    // The event handler will process events through its internal listeners
    // No need to call handleEvent directly
}

// Function to handle Slack commands
async function handleSlackCommand(event: any, runtime: IAgentRuntime) {
    const text = event.text.toLowerCase().trim();

    // Check if the user is asking about GitHub
    if (text.includes("github")) {
        const missingConfigs = [];
        if (!runtime.getSetting("GITHUB_OWNER")) missingConfigs.push("GITHUB_OWNER");
        if (!runtime.getSetting("GITHUB_REPO")) missingConfigs.push("GITHUB_REPO");
        if (!runtime.getSetting("GITHUB_API_TOKEN")) missingConfigs.push("GITHUB_API_TOKEN");

        if (missingConfigs.length > 0) {
            // Ask the user to provide missing configuration
            await runtime.clients.slack.sendMessage(event.channel, `I noticed you're interested in GitHub. The following configurations are missing: ${missingConfigs.join(", ")}. These configurations need to be set in your environment variables or configuration file.`);
            
            // Notify user about how to set up configurations
            await runtime.clients.slack.sendMessage(event.channel, "Please set these configurations in your environment variables or configuration file before proceeding.");
            
            // Return early since we can't proceed without configurations
            return;
        } else {
            await runtime.clients.slack.sendMessage(event.channel, "GitHub is already configured.");

            // Initialize GitHub client
            const githubClient = await GitHubClientInterface.start(runtime);
            if (githubClient) {
                runtime.clients.github = githubClient;
                await runtime.clients.slack.sendMessage(event.channel, "GitHub client configured successfully!");
            }
        }
    } else if (text.startsWith("!github clone")) {
        const githubClient = await GitHubClientInterface.start(runtime, true);
        await githubClient.initialize();
        await runtime.clients.slack.sendMessage(event.channel, "Repository cloned successfully!");
    } else if (text.startsWith("!github list repos")) {
        // Example command to list repositories
        const githubClient = runtime.clients.github;
        if (githubClient) {
            const repos = await githubClient.listRepositories();
            await runtime.clients.slack.sendMessage(event.channel, `Repositories: ${repos.join(", ")}`);
        } else {
            await runtime.clients.slack.sendMessage(event.channel, "GitHub client is not configured.");
        }
    }
}

// Function to wait for a response from a specific channel
function createResponsePromise(channel: string, runtime: IAgentRuntime): Promise<string> {
    return new Promise((resolve) => {
        const messageHandler = (event: any) => {
            if (event.channel === channel) {
                // Remove the event listener once we get a response
                runtime.clients.slack.removeMessageListener(messageHandler);
                resolve(event.text);
            }
        };

        // Add the message listener
        runtime.clients.slack.addMessageListener(messageHandler);
    });
}

async function promptSlackUser(channel: string, prompt: string, runtime: IAgentRuntime): Promise<string> {
    // Send a message to the Slack channel
    await runtime.clients.slack.sendMessage(channel, prompt);

    // Wait for and return the user's response
    return await createResponsePromise(channel, runtime);
}

// Ensure this function is called when Slack events are received
