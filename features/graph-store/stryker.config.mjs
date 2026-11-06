// A .mjs rather than .json so the vitest config path can be resolved from THIS file. Stryker runs
// vitest inside `.stryker-tmp/sandbox-*`, so a relative `configFile` would be looked up from there
// and not resolve; `import.meta.url` is the real location of this file. Without the root config
// vitest falls back to its 5 s testTimeout and the wide fan-out tests (12,000-id edgesOf, 3,000-edge
// reach) time out in the dry run (ADR 0007: one shared vitest config, no per-package copy).
export default {
  testRunner: "vitest",
  mutate: ["src/**/*.ts", "!src/index.ts"],
  thresholds: { high: 90, low: 80, break: 80 },
  reporters: ["clear-text", "json"],
  jsonReporter: { fileName: "reports/mutation.json" },
  plugins: ["../../node_modules/@stryker-mutator/vitest-runner/dist/src/index.js"],
  vitest: { configFile: new URL("../../vitest.config.ts", import.meta.url).pathname },
};
