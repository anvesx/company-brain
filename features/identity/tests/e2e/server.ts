import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { createIdentity } from "../../src/index.js";
import { openDb, tempDbPath } from "../support/db.js";

const SECRET = "e2e-secret-0123456789abcdef-0123456789";
const BASE = "http://localhost:18788";
/** The url the connections page renders in its install guide. The e2e tests read the same variable. */
const MCP_URL = process.env["E2E_MCP_URL"] ?? "https://brain.example.com/mcp";

/** A real createIdentity on a fresh SQLite file in a temp folder, served on port 18788. Returns a function that stops it. */
export const startServer = async (): Promise<() => Promise<void>> => {
  const db = openDb(tempDbPath());
  const identity = createIdentity({
    baseUrl: BASE,
    secret: SECRET,
    database: db,
    resource: MCP_URL,
    catalog: [{ name: "Notion", description: "Pages and databases" }],
  });
  await identity.migrate();
  const app = new Hono();
  app.route("/", identity.routes);
  const server = serve({ port: 18788, hostname: "localhost", fetch: app.fetch });
  await new Promise((done) => server.once("listening", done));
  return () =>
    new Promise<void>((done) => {
      if ("closeAllConnections" in server) server.closeAllConnections();
      server.close(() => {
        db.close();
        done();
      });
    });
};
