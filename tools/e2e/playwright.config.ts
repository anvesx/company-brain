import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { defineConfig } from "@playwright/test";
import { PORT, SECRET } from "./src/creds.ts";

// Set once in the main process; workers inherit it, so every file sees one run directory.
process.env.E2E_RUN_DIR ||= mkdtempSync(join(tmpdir(), "conn-e2e-"));
const dir = process.env.E2E_RUN_DIR;

/** The real launcher, `apps/connections/dist/bin.js`, over fresh SQLite files, on a loopback port. */
export default defineConfig({
  testDir: "tests",
  testMatch: "**/*.test.ts",
  workers: 1,
  // CI also writes an HTML report, which the workflow uploads when a run fails.
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : [["list"]],
  outputDir: "test-results",
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    trace: "on",
    screenshot: "on",
    // Optional: reuse an already installed Chromium instead of the one `playwright install` fetches.
    ...(process.env.E2E_CHROMIUM_PATH && { launchOptions: { executablePath: process.env.E2E_CHROMIUM_PATH } }),
  },
  webServer: {
    command: "node ../../apps/connections/dist/bin.js",
    url: `http://127.0.0.1:${PORT}/`,
    reuseExistingServer: false,
    env: {
      CONNECTIONS_KEY: "ab".repeat(32),
      CONNECTIONS_AUTH_SECRET: SECRET,
      CONNECTIONS_DB_PATH: join(dir, "connections.db"),
      CONNECTIONS_GRAPH_PATH: join(dir, "graph.db"),
      CONNECTIONS_ADMINS: "t1:root",
      CONNECTIONS_PORT: String(PORT),
    },
  },
});
