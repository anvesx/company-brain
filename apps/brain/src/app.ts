import type { Server } from "node:http";
import type { GraphStore } from "@anvesx/graph-store";
import { mountGraphView } from "@anvesx/graph-view";
import type { createIdentity } from "@anvesx/identity";
import { createAdaptorServer } from "@hono/node-server";
import { Hono } from "hono";
import { identityAliases } from "./gate/accounts.js";
import type { Recheck } from "./live/recheck.js";
import { mountDocuments } from "./routes/documents.js";

export interface BrainDeps {
  store: GraphStore;
  /** The identity service: sign-in, sessions and MCP tokens. The brain trusts its port and nothing else. */
  identity: ReturnType<typeof createIdentity>;
  /** Optional live check against the source, run per query after the graph says yes. */
  recheck?: Recheck;
  /** 32 bytes that sign graph-view cursors; instances behind one load balancer must share it. */
  cursorKey: Uint8Array;
  port?: number;
  host?: string;
}
export interface BrainApp {
  server: Server;
  listen(): Promise<void>;
  close(): Promise<void>;
}

/** One origin: identity's routes, the documents API and the graph view, so one session cookie opens all of them. */
export function createBrainApp(deps: BrainDeps): BrainApp {
  const { store, identity, recheck, cursorKey } = deps;
  const app = new Hono();
  // Never show a caller a stack or a message from inside: a failure is a plain 500.
  app.onError((_error, c) => c.json({ error: "internal" }, 500));
  app.route("/", identity.routes);
  const aliases = identityAliases(identity);
  mountDocuments(app, { store, protect: identity.protect, aliases, ...(recheck && { recheck }) });
  mountGraphView(app, { store, port: identity.port, aliases, cursorKey });

  const server = createAdaptorServer({ fetch: app.fetch }) as Server;
  return {
    server,
    listen: () =>
      new Promise((ok, fail) => {
        server.once("error", fail); // for example EADDRINUSE
        server.listen(deps.port ?? 0, deps.host ?? "127.0.0.1", () => {
          server.off("error", fail);
          ok();
        });
      }),
    close: () =>
      new Promise((ok) => {
        server.close(() => ok());
        server.closeAllConnections();
      }),
  };
}
