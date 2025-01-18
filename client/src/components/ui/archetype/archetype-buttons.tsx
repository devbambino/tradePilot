import { apiClient } from "@/lib/api";
import { ArchetypeName, archetypes } from "@/types/archetypes";
import { type UUID } from "@elizaos/core";
import { Button } from "../button";
import { useState } from "react";

type ArcheTypeButtonsProps = {
    agentId: UUID;
    selectedArchetype: ArchetypeName | null;
    setApplyStatus: (status: string | null) => void;
};

const ArcheTypeButtons = ({
    agentId,
    selectedArchetype,
    setApplyStatus,
}: ArcheTypeButtonsProps) => {
    const [isApplying, setIsApplying] = useState(false);

    const handleApply = async () => {
        if (!selectedArchetype) return;

        if (
            !window.confirm(
                `Are you sure you want to apply the ${selectedArchetype} archetype?`
            )
        )
            return;

        try {
            setIsApplying(true);
            await apiClient.applyArchetype(
                agentId as UUID,
                archetypes[selectedArchetype]
            );
            setApplyStatus("success");
        } catch (error) {
            console.error("Failed to apply archetype:", error);
            setApplyStatus(
                `Error: ${error instanceof Error ? error.message : "Unknown error"}`
            );
        } finally {
            setIsApplying(false);
        }

        setTimeout(() => setApplyStatus(null), 3000);
    };

    const handleDownload = () => {
        if (!selectedArchetype) return;

        const blob = new Blob(
            [JSON.stringify(archetypes[selectedArchetype], null, 2)],
            { type: "application/json" }
        );
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `${selectedArchetype}.json`;
        link.click();
        URL.revokeObjectURL(url);
    };

    return (
        <div className="flex gap-4 mt-4">
            <Button
                onClick={handleDownload}
                className="bg-blue-600 text-white rounded disabled:opacity-50"
                disabled={!selectedArchetype}
            >
                Download Archetype
            </Button>

            <Button
                onClick={handleApply}
                className="bg-green-600 text-white rounded disabled:opacity-50"
                disabled={!selectedArchetype || !agentId || isApplying}
            >
                {isApplying ? "Applying..." : "Apply Archetype"}
            </Button>
        </div>
    );
};

export default ArcheTypeButtons;
