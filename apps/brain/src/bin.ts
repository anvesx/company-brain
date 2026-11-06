#!/usr/bin/env node
const command = process.argv[2];

// What SIGTERM should close. Starts as a no-op: a signal that arrives before the server exists has nothing to close,
// so the handler exits 0 at once. Static `import`s would finish loading before any line here runs, hence dynamic ones.
let shutdown: () => Promise<unknown> = async () => undefined;
// `sync` is excluded on purpose: an interrupted sync must not look like a success (it keeps the default: killed by the signal).
if (command !== "sync") process.once("SIGTERM", () => void shutdown().then(() => process.exit(0)));

if (command === "sync") {
  const { runSync } = await import("./cli/sync.js");
  const r = await runSync(process.env, () => Date.now() / 1000).catch((e: Error) => {
    console.error(`brain sync: ${e.message}`);
    return process.exit(1);
  });
  console.log(`synced ${r.nodes} nodes, ${r.edges} edges, ${r.removed} removed in ${r.pages} pages`);
  process.exit(0);
}

// `brain serve` is the production entry: Postgres, identity and /healthz (see serve/).
if (command === "serve") {
  const { serve } = await import("./serve/serve.js");
  // On node 26 the SIGTERM handler does not run while an `import()` is in flight: it is deferred until the import
  // finishes. Without this line `serve()` below would run first (bind, log "brain listening", migrate) and only then
  // would the handler fire. One turn of the event loop lets a pending signal run the no-op handler: exit 0, nothing bound.
  await new Promise((ok) => setImmediate(ok));
  // serve() resolves once it is listening. A SIGTERM after that calls close(), which waits for the migration still running.
  const running = serve(process.env).catch((e: Error) => {
    console.error(`brain: ${e.message}`);
    return process.exit(1);
  });
  shutdown = async () => (await running).close();
  await running;
} else if (command !== undefined) {
  console.error("usage: brain [sync|serve]   (no argument starts the local server)");
  process.exit(2);
} else {
  // The local path: SQLite files and identity on one origin (see serve/start.ts).
  const { explain, startBrain } = await import("./serve/local/start.js");
  try {
    const { app, config } = await startBrain(process.env);
    console.log(`brain listening on ${config.host ?? "127.0.0.1"}:${config.port}, sign-in at ${config.baseUrl}`);
    shutdown = () => app.close();
  } catch (error) {
    const line = explain(error, Number(process.env.BRAIN_PORT ?? 8787));
    if (!line) throw error;
    console.error(`brain: ${line}`);
    process.exit(1);
  }
}
