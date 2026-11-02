import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import type { GraphNode, GraphStore } from "@anvesx/graph-store";
import { canRead, readableDocuments } from "./access.js";
import { MIN_SECRET_CHARS, verify } from "./auth.js";
import { type Recheck, stillReadable } from "./live/recheck.js";

export interface BrainDeps {
  store: GraphStore;
  secret: string;
  now: () => number;
  port?: number;
  host?: string;
  /** Optional live check against the source, run per query after the graph says yes. */
  recheck?: Recheck;
}
export interface BrainApp {
  server: Server;
  listen(): Promise<void>;
  close(): Promise<void>;
}

/** A pointer: where the text lives, never the text. */
const pointer = (n: GraphNode) => ({ id: n.id, source: n.source, address: n.address, title: n.title, version: n.version });
const send = (res: ServerResponse, status: number, body: unknown) => {
  res.writeHead(status, { "content-type": "application/json" }).end(JSON.stringify(body));
};

export function createBrainApp(deps: BrainDeps): BrainApp {
  if (typeof deps.secret !== "string" || deps.secret.length < MIN_SECRET_CHARS) throw new Error(`secret must be at least ${MIN_SECRET_CHARS} characters`);
  const { store } = deps;
  const handle = (req: IncomingMessage, res: ServerResponse): void => {
    route(req, res).catch(() => send(res, 500, { error: "internal" }));
  };
  const route = async (req: IncomingMessage, res: ServerResponse): Promise<void> => {
    const caller = verify(req.headers.authorization, deps.secret, Math.floor(deps.now()));
    if (!caller) {
      send(res, 401, { error: "unauthorized" });
      return;
    }
    if (req.method !== "GET") {
      send(res, 405, { error: "read only" });
      return;
    }
    const path = new URL(req.url ?? "/", "http://x").pathname;
    if (path === "/v1/documents") {
      const docs = await stillReadable(readableDocuments(store, caller.tenant, caller.user), caller, deps.recheck);
      send(res, 200, { documents: docs.map(pointer) });
      return;
    }
    const id = /^\/v1\/documents\/([^/]+)$/.exec(path)?.[1];
    const node = id ? store.node(caller.tenant, decodeURIComponent(id)) : undefined;
    const live = node && canRead(store, caller.tenant, caller.user, node.id) ? await stillReadable([node], caller, deps.recheck) : [];
    if (!id || !node || node.kind !== "document" || live.length === 0) {
      send(res, 404, { error: "not found" });
      return;
    }
    send(res, 200, pointer(node));
  };
  const server = createServer((req, res) => {
    try {
      handle(req, res);
    } catch {
      send(res, 500, { error: "internal" });
    }
  });
  return {
    server,
    listen: () => new Promise((ok) => server.listen(deps.port ?? 0, deps.host ?? "127.0.0.1", ok)),
    close: () => new Promise((ok) => server.close(() => ok())),
  };
}
