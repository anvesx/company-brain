#!/usr/bin/env node
import { runSync } from "./cli/sync.js";
import { explain, startBrain } from "./serve/start.js";

const command = process.argv[2];
if (command !== undefined && command !== "sync") {
  console.error("usage: brain [sync]   (no argument starts the server)");
  process.exit(2);
}
if (command === "sync") {
  const r = await runSync(process.env, () => Date.now() / 1000).catch((e: Error) => {
    console.error(`brain sync: ${e.message}`);
    return process.exit(1);
  });
  console.log(`synced ${r.nodes} nodes, ${r.edges} edges, ${r.removed} removed in ${r.pages} pages`);
  process.exit(0);
}

try {
  const { app, config } = await startBrain(process.env);
  console.log(`brain listening on ${config.host ?? "127.0.0.1"}:${config.port}, sign-in at ${config.baseUrl}`);
  process.once("SIGTERM", () => void app.close().then(() => process.exit(0)));
} catch (error) {
  const line = explain(error, Number(process.env.BRAIN_PORT ?? 8787));
  if (!line) throw error;
  console.error(`brain: ${line}`);
  process.exit(1);
}
