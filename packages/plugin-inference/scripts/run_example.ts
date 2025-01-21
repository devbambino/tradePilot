import { runInferenceExample } from "../src/examples/inference_example";

console.log("Running Active Inference Example...\n");

runInferenceExample()
    .then(() => {
        console.log("\nExample completed successfully!");
        process.exit(0);
    })
    .catch((error) => {
        console.error("Error running example:", error);
        process.exit(1);
    });
