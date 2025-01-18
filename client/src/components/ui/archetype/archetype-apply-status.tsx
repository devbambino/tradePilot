type ArchetypeApplyStatusProps = {
    applyStatus: string | null;
};

const ArchetypeApplyStatus = ({ applyStatus }: ArchetypeApplyStatusProps) => {
    let message;
    let containerClass;
    if (applyStatus === "success") {
        message = "Archetype applied successfully!";
        containerClass = "text-green-600";
    } else {
        message = "Failed to apply archetype. Please try again";
        containerClass = "text-red-600";
    }

    return <div className={`mt-2 ${containerClass}`}>{message}</div>;
};

export default ArchetypeApplyStatus;
