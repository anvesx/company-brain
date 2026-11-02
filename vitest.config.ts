import { defineConfig } from "vitest/config";

// Shared by every package: each runs `vitest run --config ../../vitest.config.ts`, so the
// package folder keeps no vitest config file (ADR 0007). Paths are relative to the package.
export default defineConfig({ test: { testTimeout: 30_000, include: ["tests/**/*.test.ts"], coverage: { thresholds: { lines: 90 } } } });
