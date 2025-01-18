import { ArchetypeName, archetypes } from "@/types/archetypes";

type ArchetypeDisplayProps = {
    selectedArchetype: ArchetypeName;
};

const ArchetypeDisplay = ({ selectedArchetype }: ArchetypeDisplayProps) => (
    <div>
        <h3 className="text-md font-semibold">Preview</h3>
        <pre className="p-4 bg-gray-800 text-white rounded border overflow-auto">
            {JSON.stringify(archetypes[selectedArchetype], null, 2)}
        </pre>
    </div>
);

export default ArchetypeDisplay;
