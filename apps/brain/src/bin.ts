#!/usr/bin/env node
import { createBrainApp } from "./app.js";
import { demoDeps, readEnv } from "./config.js";

const env = readEnv(process.env);
if (!env.demo) {
  console.error("brain: no connector configured. Set BRAIN_DEMO=1 to run with the demo connector.");
  process.exit(1);
}
const app = await createBrainApp({
  ...demoDeps(),
  auditDbPath: env.auditDbPath,
  anchorPath: env.anchorPath,
  transport: "http",
  port: env.port,
});
for (const tenant of ["acme"]) await app.ingest(tenant);
console.log(`brain listening on http://127.0.0.1:${app.port}/mcp (demo tenant: acme, token alice:acme)`);
const stop = () => void app.close().then(() => process.exit(0));
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
