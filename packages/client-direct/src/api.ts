import express from "express";
import bodyParser from "body-parser";
import cors from "cors";

import {
    AgentRuntime,
    elizaLogger,
    getEnvVariable,
    validateCharacterConfig,
} from "@elizaos/core";

import { REST, Routes } from "discord.js";
import { DirectClient } from ".";
import { stringToUuid } from "@elizaos/core";
import { WebhookEvent } from "@elizaos/client-coinbase";

export function createApiRouter(
    agents: Map<string, AgentRuntime>,
    directClient: DirectClient
) {
    const router = express.Router();

    router.use(cors());
    router.use(bodyParser.json());
    router.use(bodyParser.urlencoded({ extended: true }));
    router.use(
        express.json({
            limit: getEnvVariable("EXPRESS_MAX_PAYLOAD") || "100kb",
        })
    );

    router.get("/webhook/coinbase/health", (req, res) => {
        elizaLogger.info("Health check received");
        res.status(200).json({ status: "ok" });
    });

    router.post("/webhook/coinbase/:agentId", async (req, res) => {
        elizaLogger.info("Webhook received for agent:", req.params.agentId);
        const agentId = req.params.agentId;
        const runtime = agents.get(agentId);

        if (!runtime) {
            res.status(404).json({ error: "Agent not found" });
            return;
        }

        // Validate the webhook payload
        const event = req.body as WebhookEvent;
        if (!event.event || !event.ticker || !event.timestamp || !event.price) {
            res.status(400).json({ error: "Invalid webhook payload" });
            return;
        }
        if (event.event !== 'buy' && event.event !== 'sell') {
            res.status(400).json({ error: "Invalid event type" });
            return;
        }

        try {
            // Access the coinbase client through the runtime
            const coinbaseClient = runtime.clients.coinbase as any;
            if (!coinbaseClient) {
                res.status(400).json({ error: "Coinbase client not initialized for this agent" });
                return;
            }

            // Forward the webhook event to the client's handleWebhookEvent method
            await coinbaseClient.handleWebhookEvent(event);
            res.status(200).json({ status: "success" });
        } catch (error) {
            elizaLogger.error("Error processing Coinbase webhook:", error);
            res.status(500).json({ error: "Internal Server Error" });
        }
    });

    router.get("/", (req, res) => {
        res.send("Welcome, this is the REST API!");
    });

    router.get("/hello", (req, res) => {
        res.json({ message: "Hello World!" });
    });

    router.get("/agents", (req, res) => {
        const agentsList = Array.from(agents.values()).map((agent) => ({
            id: agent.agentId,
            name: agent.character.name,
            clients: Object.keys(agent.clients),
        }));
        res.json({ agents: agentsList });
    });

    router.get("/agents/:agentId", (req, res) => {
        const agentId = req.params.agentId;
        const agent = agents.get(agentId);

        if (!agent) {
            res.status(404).json({ error: "Agent not found" });
            return;
        }

        res.json({
            id: agent.agentId,
            character: agent.character,
        });
    });

    router.post("/agents/:agentId/set", async (req, res) => {
        const agentId = req.params.agentId;
        console.log("agentId", agentId);
        let agent: AgentRuntime = agents.get(agentId);

        // update character
        if (agent) {
            // stop agent
            agent.stop();
            directClient.unregisterAgent(agent);
            // if it has a different name, the agentId will change
        }

        // load character from body
        const character = req.body;
        try {
            validateCharacterConfig(character);
        } catch (e) {
            elizaLogger.error(`Error parsing character: ${e}`);
            res.status(400).json({
                success: false,
                message: e.message,
            });
            return;
        }

        // start it up (and register it)
        agent = await directClient.startAgent(character);
        elizaLogger.log(`${character.name} started`);

        res.json({
            id: character.id,
            character: character,
        });
    });

    router.get("/agents/:agentId/channels", async (req, res) => {
        const agentId = req.params.agentId;
        const runtime = agents.get(agentId);

        if (!runtime) {
            res.status(404).json({ error: "Runtime not found" });
            return;
        }

        const API_TOKEN = runtime.getSetting("DISCORD_API_TOKEN") as string;
        const rest = new REST({ version: "10" }).setToken(API_TOKEN);

        try {
            const guilds = (await rest.get(Routes.userGuilds())) as Array<any>;

            res.json({
                id: runtime.agentId,
                guilds: guilds,
                serverCount: guilds.length,
            });
        } catch (error) {
            console.error("Error fetching guilds:", error);
            res.status(500).json({ error: "Failed to fetch guilds" });
        }
    });

    router.get("/agents/:agentId/:roomId/memories", async (req, res) => {
        const agentId = req.params.agentId;
        const roomId = stringToUuid(req.params.roomId);
        let runtime = agents.get(agentId);

        // if runtime is null, look for runtime with the same name
        if (!runtime) {
            runtime = Array.from(agents.values()).find(
                (a) => a.character.name.toLowerCase() === agentId.toLowerCase()
            );
        }

        if (!runtime) {
            res.status(404).send("Agent not found");
            return;
        }

        try {
            const memories = await runtime.messageManager.getMemories({
                roomId,
            });
            const response = {
                agentId,
                roomId,
                memories: memories.map((memory) => ({
                    id: memory.id,
                    userId: memory.userId,
                    agentId: memory.agentId,
                    createdAt: memory.createdAt,
                    content: {
                        text: memory.content.text,
                        action: memory.content.action,
                        source: memory.content.source,
                        url: memory.content.url,
                        inReplyTo: memory.content.inReplyTo,
                        attachments: memory.content.attachments?.map(
                            (attachment) => ({
                                id: attachment.id,
                                url: attachment.url,
                                title: attachment.title,
                                source: attachment.source,
                                description: attachment.description,
                                text: attachment.text,
                                contentType: attachment.contentType,
                            })
                        ),
                    },
                    embedding: memory.embedding,
                    roomId: memory.roomId,
                    unique: memory.unique,
                    similarity: memory.similarity,
                })),
            };

            res.json(response);
        } catch (error) {
            console.error("Error fetching memories:", error);
            res.status(500).json({ error: "Failed to fetch memories" });
        }
    });

    // Add Coinbase webhook forwarding endpoint
    router.post("/webhook/coinbase/:agentId", async (req, res) => {
        const agentId = req.params.agentId;
        const runtime = agents.get(agentId);

        if (!runtime) {
            res.status(404).json({ error: "Agent not found" });
            return;
        }

        // Validate the webhook payload
        const event = req.body as WebhookEvent;
        if (!event.event || !event.ticker || !event.timestamp || !event.price) {
            res.status(400).json({ error: "Invalid webhook payload" });
            return;
        }
        if (event.event !== 'buy' && event.event !== 'sell') {
            res.status(400).json({ error: "Invalid event type" });
            return;
        }

        try {
            // Access the coinbase client through the runtime
            const coinbaseClient = runtime.clients.coinbase as any;
            if (!coinbaseClient) {
                res.status(400).json({ error: "Coinbase client not initialized for this agent" });
                return;
            }

            // Forward the webhook event to the client's handleWebhookEvent method
            await coinbaseClient.handleWebhookEvent(event);
            res.status(200).json({ status: "success" });
        } catch (error) {
            elizaLogger.error("Error processing Coinbase webhook:", error);
            res.status(500).json({ error: "Internal Server Error" });
        }
    });

    // Add health check endpoint for Coinbase webhook
    router.get("/webhook/coinbase/health", (req, res) => {
        res.status(200).json({ status: "ok" });
    });

    return router;
}
