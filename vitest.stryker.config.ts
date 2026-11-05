import { defineConfig } from "vitest/config";

// Mutation runs use every test except tests/scale. The scale tests time the code, and Stryker's
// per-test instrumentation makes those timings meaningless (change-cursor: 2.3 s against a 500 ms
// budget; source-trust: 2.45 s CPU against 2 s). Stryker scores the code, not the clock.
export default defineConfig({
  test: { include: ["tests/**/*.test.ts"], exclude: ["**/node_modules/**", "tests/scale/**"] },
});
