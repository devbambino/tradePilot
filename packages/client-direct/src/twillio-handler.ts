import { WebSocket } from "ws";
import { Readable } from "stream";
import { ElevenLabsClient } from "elevenlabs";

interface TwilioMessage {
    event: string;
    start?: {
        streamSid: string;
        callSid: string;
    };
    media?: {
        track: number;
        chunk: number;
        timestamp: number;
        payload: string;
    };
}

interface RuntimeMessage {
    content: {
        text: string;
    };
}

async function streamToArrayBuffer(
    readableStream: Readable
): Promise<ArrayBuffer> {
    return new Promise((resolve, reject) => {
        const chunks: Buffer[] = [];
        readableStream.on("data", (chunk) => chunks.push(chunk));
        readableStream.on("end", () => resolve(Buffer.concat(chunks).buffer));
        readableStream.on("error", reject);
    });
}

export async function handleCallConnection(
    ws: WebSocket,
    runtime: any,
    userId: string,
    roomId: string
) {
    const elevenlabs = new ElevenLabsClient({
        apiKey: process.env.ELEVENLABS_API_KEY,
    });

    const voiceId = process.env.ELEVENLABS_VOICE_ID || "21m00Tcm4TlvDq8ikWAM";
    const outputFormat = "ulaw_8000";

    ws.on("message", async (data: string) => {
        try {
            const message: TwilioMessage = JSON.parse(data);

            if (message.event === "start" && message.start) {
                const streamSid = message.start.streamSid;

                // Get response from runtime
                await runtime.ensureConnection(
                    userId,
                    roomId,
                    "Phone User",
                    "Phone",
                    "direct"
                );

                const userMessage = {
                    content: { text: "Incoming call" },
                    userId,
                    roomId,
                    agentId: runtime.agentId,
                };

                const state = await runtime.composeState(userMessage);
                const response = await runtime.generateResponse(state);

                if (!response?.content?.text) {
                    throw new Error("No response generated");
                }

                // Convert to speech
                const audioResponse = await elevenlabs.textToSpeech.convert(
                    voiceId,
                    {
                        model_id: "eleven_flash_v2_5",
                        output_format: outputFormat,
                        text: response.content.text,
                    }
                );

                const readableStream = Readable.from(audioResponse);
                const audioBuffer = await streamToArrayBuffer(readableStream);

                // Send to Twilio
                ws.send(
                    JSON.stringify({
                        streamSid,
                        event: "media",
                        media: {
                            payload:
                                Buffer.from(audioBuffer).toString("base64"),
                        },
                    })
                );

                // Close after sending
                ws.send(
                    JSON.stringify({
                        streamSid,
                        event: "stop",
                    })
                );
            }
        } catch (error) {
            console.error("Error in call connection:", error);
            ws.close();
        }
    });

    ws.on("error", (error) => {
        console.error("WebSocket error:", error);
        ws.close();
    });

    ws.on("close", () => {
        console.log("Call connection closed");
    });
}
