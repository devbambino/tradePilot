import { IAgentRuntime, type Relationship, type UUID } from "./types.ts";

export const createRelationship = async ({
    runtime,
    userA,
    userB,
}: {
    runtime: IAgentRuntime;
    userA: UUID;
    userB: UUID;
}): Promise<boolean> => {
    return runtime.databaseAdapter.createRelationship({ userA, userB });
};

export const getRelationship = async ({
    runtime,
    userA,
    userB,
}: {
    runtime: IAgentRuntime;
    userA: UUID;
    userB: UUID;
}): Promise<Relationship | null> => {
    return runtime.databaseAdapter.getRelationship({ userA, userB });
};

export const getRelationships = async ({
    runtime,
    userId,
}: {
    runtime: IAgentRuntime;
    userId: UUID;
}): Promise<Relationship[]> => {
    return runtime.databaseAdapter.getRelationships({ userId });
};

export const formatRelationships = async ({
    runtime,
    userId,
}: {
    runtime: IAgentRuntime;
    userId: UUID;
}): Promise<UUID[]> => {
    const relationships = await getRelationships({ runtime, userId });

    return relationships.map(({ userA, userB }: Relationship) =>
        userA === userId ? userB : userA
    );
};
