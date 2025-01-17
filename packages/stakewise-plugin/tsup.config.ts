import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"], // Main entry point for your plugin
  format: ["cjs", "esm"],  // CommonJS and ES Modules formats
  dts: true,               // Generate TypeScript declarations
  sourcemap: true,         // Generate sourcemaps for debugging
  clean: true,             // Clean output directory before building
  target: "es2020",        // Specify the target ECMAScript version
});
