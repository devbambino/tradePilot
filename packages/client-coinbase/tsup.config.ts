import { defineConfig } from "tsup";

export default defineConfig({
    entry: ["src/index.ts"],
    outDir: "dist",
    sourcemap: true,
    clean: true,
    format: ["esm"],
    dts: true,
    splitting: false,
    bundle: true,
    minify: false,
    external: [
        "@elizaos/core",
        "@elizaos/plugin-coinbase",
        "express",
        "body-parser",
        "node-fetch",
        // ... other externals
    ],
    platform: 'node',
    target: 'node23',
    esbuildOptions(options) {
        options.mainFields = ["module", "main"];
        options.conditions = ["import", "module", "require", "default"];
        options.platform = "node";
    }
});