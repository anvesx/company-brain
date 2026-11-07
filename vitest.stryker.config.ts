import { defineConfig } from "vitest/config";

// Mutation runs use every test except tests/scale. The scale tests time the code, and Stryker's
// per-test instrumentation makes those timings meaningless (change-cursor: 2.3 s against a 500 ms
// budget; source-trust: 2.45 s CPU against 2 s). Stryker scores the code, not the clock.
// testTimeout matches vitest.config.ts: without it vitest's 5 s default applies, and the graph-view
// dry run tripped it on CI serving the 1 MB 3d-force-graph build (run 42288381991, 23:42 UTC 6 Nov).
export default defineConfig({
  test: { testTimeout: 30_000, include: ["tests/**/*.test.ts"], exclude: ["**/node_modules/**", "tests/scale/**"] },
});
