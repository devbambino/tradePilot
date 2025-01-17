export default {
  preset: "ts-jest",
  testEnvironment: "node",
  transform: {
    "^.+\\.ts?$": "ts-jest",
  },
  moduleFileExtensions: ["ts", "js"],
  transformIgnorePatterns: [
    "node_modules/(?!(dotenv|@ai16z/eliza))", // Transform these dependencies
  ],
  extensionsToTreatAsEsm: [".ts"],
};
