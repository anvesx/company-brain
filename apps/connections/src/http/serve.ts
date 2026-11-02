import type { Server } from "node:http";
import { serve } from "@hono/node-server";
import type { Hono } from "hono";

/** Listens on 127.0.0.1 and resolves once bound; pass port 0 for a free port. */
export const startServer = (app: Hono, port: number): Promise<Server> =>
  new Promise((resolve) => {
    const s = serve({ fetch: app.fetch, port, hostname: "127.0.0.1" }, () => resolve(s as Server));
  });
