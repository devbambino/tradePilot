import React, { useState } from "react";
import { ArchetypeName } from "../types/archetypes";
import { useParams } from "react-router";
import { type UUID } from "@elizaos/core";
import ArcheTypeButtons from "./ui/archetype/archetype-buttons";
import ArchetypeDisplay from "./ui/archetype/archetype-display";
import ArchetypeSelection from "./ui/archetype/archetype-selection";
import ArchetypeApplyStatus from "./ui/archetype/archetype-apply-status";
import ArchetypeNoAgent from "./ui/archetype/archetype-no-agent";

export const ArchetypeSelector: React.FC = () => {
    const { agentId } = useParams<{ agentId: UUID }>();

    if (!agentId) {
        return <ArchetypeNoAgent />;
    }

    const [selectedArchetype, setSelectedArchetype] =
        useState<ArchetypeName | null>(null);
    const [applyStatus, setApplyStatus] = useState<string | null>(null);

    return (
        <div className="p-4">
            <h2 className="text-lg font-bold mb-4">
                Character Archetype Selector
            </h2>

            <ArchetypeSelection setSelectedArchetype={setSelectedArchetype} />

            {selectedArchetype && (
                <ArchetypeDisplay selectedArchetype={selectedArchetype} />
            )}

            <ArcheTypeButtons
                agentId={agentId}
                selectedArchetype={selectedArchetype}
                setApplyStatus={setApplyStatus}
            />

            <ArchetypeApplyStatus applyStatus={applyStatus} />
        </div>
    );
};
