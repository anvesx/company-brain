import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/contract/**/*.contract.ts"],
    testTimeout: 60_000,
    fileParallelism: false,
  },
});
