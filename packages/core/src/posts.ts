import { formatTimestamp } from "./messages.ts";
import type { Actor, Memory } from "./types.ts";

export const formatPosts = ({
    messages,
    actors,
    conversationHeader = true,
}: {
    messages: Memory[];
    actors: Actor[];
    conversationHeader?: boolean;
}) => {
    // Group messages by roomId using reduce
    const groupedMessages = messages.reduce<Record<string, Memory[]>>((acc, message) => {
        if (message.roomId) {
            acc[message.roomId] = [...(acc[message.roomId] ?? []), message];
        }
        return acc;
    }, {});

    // Sort messages within each roomId
    Object.values(groupedMessages).forEach((roomMessages) => {
        roomMessages.sort((a, b) => a.createdAt - b.createdAt);
    });

    // Sort rooms by the newest message's createdAt
    const sortedRooms = Object.entries(groupedMessages).sort(
        ([, messagesA], [, messagesB]) => {
            const latestB = messagesB[messagesB.length - 1].createdAt;
            const latestA = messagesA[messagesA.length - 1].createdAt;
            return latestB - latestA;
        }
    );

    const formattedPosts = sortedRooms.map(([roomId, roomMessages]) => {
        const messageStrings = roomMessages
            .filter(({ userId }) => userId)
            .map((message) => {
                const { id, content, createdAt, userId } = message;
                const actor = actors.find((actor) => actor.id === userId);
                const { name: userName = "Unknown User", username: displayName = "unknown" } = actor ?? {};

                return `Name: ${userName} (@${displayName})
ID: ${id}${content.inReplyTo ? `\nIn reply to: ${content.inReplyTo}` : ""}
Date: ${formatTimestamp(createdAt)}
Text:
${content.text}`;
            });

        const header = conversationHeader ? `Conversation: ${roomId.slice(-5)}\n` : "";
        return `${header}${messageStrings.join("\n\n")}`;
    });

    return formattedPosts.join("\n\n");
};
