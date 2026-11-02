#!/usr/bin/env node
import { createGraphStore } from "@anvesx/graph-store";
import { createBrainApp } from "./app.js";
import { recheckFromEnv } from "./cli/recheck.js";
import { runSync } from "./cli/sync.js";

if (process.argv[2] === "sync") {
  const r = await runSync(process.env, () => Date.now() / 1000).catch((e: Error) => {
    console.error(`brain sync: ${e.message}`);
    return process.exit(1);
  });
  console.log(`synced ${r.nodes} nodes, ${r.edges} edges, ${r.removed} removed in ${r.pages} pages`);
  process.exit(0);
}

const { BRAIN_GRAPH_PATH: path, BRAIN_AUTH_SECRET: secret, BRAIN_PORT: port, BRAIN_HOST: host } = process.env;
if (!path || !secret) {
  console.error("brain: BRAIN_GRAPH_PATH and BRAIN_AUTH_SECRET (32+ characters) are required");
  process.exit(1);
}
const recheck = recheckFromEnv(process.env);
const app = createBrainApp({
  ...(recheck && { recheck }),
  store: createGraphStore({ path }),
  secret,
  now: () => Date.now() / 1000,
  port: Number(port ?? 8787),
  ...(host ? { host } : {}),
});
await app.listen();
console.log(`brain graph api listening on ${host ?? "127.0.0.1"}:${port ?? 8787}`);
process.once("SIGTERM", () => void app.close().then(() => process.exit(0)));
