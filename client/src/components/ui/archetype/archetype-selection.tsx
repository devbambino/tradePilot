import { ArchetypeName } from "@/types/archetypes";

type ArchetypeSelectionProps = {
    setSelectedArchetype: (selectedArchetype: ArchetypeName) => void;
};

const ArchetypeSelection = ({
    setSelectedArchetype,
}: ArchetypeSelectionProps) => (
    <div className="mb-4">
        <label htmlFor="archetype-select" className="block text-sm font-medium">
            Select an Archetype
        </label>
        <select
            id="archetype-select"
            className="mt-2 p-2 border rounded"
            onChange={(e) =>
                setSelectedArchetype(e.target.value as ArchetypeName)
            }
        >
            <option value="">-- Select --</option>
            {Object.keys(ArchetypeName).map((key) => (
                <option key={key} value={key}>
                    {key}
                </option>
            ))}
        </select>
    </div>
);

export default ArchetypeSelection;
