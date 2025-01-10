import {
    IAgentRuntime,
    type Actor,
    type Content,
    type Memory,
    type UUID,
} from "./types.ts";

/**
 * Get details for a list of actors.
 */
export async function getActorDetails({
    runtime,
    roomId,
}: {
    runtime: IAgentRuntime;
    roomId: UUID;
}) {
    const participantIds =
        await runtime.databaseAdapter.getParticipantsForRoom(roomId);
    const actors = await Promise.all(
        participantIds.map(async (userId) => {
            const account =
                await runtime.databaseAdapter.getAccountById(userId);
            if (account) {
                return {
                    id: account.id,
                    name: account.name,
                    username: account.username,
                    details: account.details,
                };
            }
            return null;
        })
    );

    return actors.filter((actor): actor is Actor => actor !== null);
}

/**
 * Format actors into a string
 * @param actors - list of actors
 * @returns string
 */
export function formatActors({ actors }: { actors: Actor[] }) {
    return actors.map(({ name, details }) =>
        `${name}${details?.tagline ? `: ${details.tagline}` : ''}${details?.summary ? `\n${details.summary}` : ''}`
    ).join('\n');
}

/**
 * Format messages into a string
 * @param messages - list of messages
 * @param actors - list of actors
 * @returns string
 */
export const formatMessages = ({ messages, actors }: { messages: Memory[]; actors: Actor[] }) => {
    return messages
        .reverse()
        .filter(({ userId }) => userId)
        .map(({ userId, content, createdAt }) => {
            const { text: messageContent, action: messageAction, attachments = [] } = content as Content;

            const formattedName = actors.find(actor => actor.id === userId)?.name ?? 'Unknown User';

            const attachmentString = attachments.length
                ? ` (Attachments: ${attachments.map(({ id, title, url }) =>
                    `[${id} - ${title} (${url})]`).join(', ')})`
                : '';

            const timestamp = formatTimestamp(createdAt);
            const shortId = userId.slice(-5);

            return `(${timestamp}) [${shortId}] ${formattedName}: ${messageContent}${attachmentString}${messageAction && messageAction !== 'null' ? ` (${messageAction})` : ''}`;
        })
        .join('\n');
};

export const formatTimestamp = (messageDate: number) => {
    const now = new Date();
    const diff = now.getTime() - messageDate;
    const absDiff = Math.abs(diff);

    const times = {
        minute: 60 * 1000,
        hour: 60 * 60 * 1000,
        day: 24 * 60 * 60 * 1000
    };

    if (absDiff < times.minute) return 'just now';

    const units = {
        minutes: Math.floor(absDiff / times.minute),
        hours: Math.floor(absDiff / times.hour),
        days: Math.floor(absDiff / times.day)
    };

    if (units.minutes < 60) return `${units.minutes} minute${units.minutes !== 1 ? 's' : ''} ago`;
    if (units.hours < 24) return `${units.hours} hour${units.hours !== 1 ? 's' : ''} ago`;
    return `${units.days} day${units.days !== 1 ? 's' : ''} ago`;
};
