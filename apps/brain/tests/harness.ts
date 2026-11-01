import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { createCursorStore } from "@brain/change-cursor";
import { type Connector, createFakeConnector } from "@brain/connector-kit";
import type { Principal } from "@brain/core-types";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { afterAll } from "vitest";
import { type BrainApp, type BrainDeps, createBrainApp } from "../src/index.js";
import { doc, docs, docs2 } from "./fixtures.js";

export { doc, docs, docs2 };

const dir = mkdtempSync(join(tmpdir(), "brain-"));
afterAll(() => rmSync(dir, { recursive: true, force: true }));
let n = 0;

/** Bearer token "user:tenant". A missing header is unauthenticated. */
export function principalFor(extra: unknown): Principal {
  const headers = (extra as { requestInfo?: { headers?: Record<string, string | undefined> } }).requestInfo?.headers;
  const token = headers?.authorization?.replace(/^Bearer /, "");
  if (!token) throw new Error("unauthenticated");
  const [id = "", tenantId = ""] = token.split(":");
  return { id, tenantId, groups: [] };
}

export async function start(over: Partial<BrainDeps> = {}) {
  const connectors: Record<string, Connector | undefined> = {
    t1: createFakeConnector("fake", docs()),
    t2: createFakeConnector("fake", docs2()),
  };
  const tokenFor = (tenantId: string) => (connectors[tenantId] ? `token-${tenantId}` : undefined);
  const auditDbPath = join(dir, `${n++}.db`);
  const app: BrainApp = await createBrainApp({
    connectorFor: (tenantId) => connectors[tenantId],
    tokenFor,
    cursors: createCursorStore(":memory:", () => 1000),
    clock: () => 1000,
    embed: async (ts) => ts.map(() => [1, 0]),
    embedQuery: async () => [1, 0],
    fetchText: async (p) => (await connectors[p.tenantId]!.fetch(p.address, { token: tokenFor(p.tenantId)! })).text,
    principalFor,
    auditDbPath,
    anchorPath: `${auditDbPath}.anchors`,
    transport: "http",
    port: 0,
    ...over,
  });
  return { app, auditDbPath };
}

export async function connect(port: number | undefined, token?: string): Promise<Client> {
  const headers: Record<string, string> = token ? { authorization: `Bearer ${token}` } : {};
  const client = new Client({ name: "t", version: "1" });
  const url = new URL(`http://127.0.0.1:${port}/mcp`);
  await client.connect(new StreamableHTTPClientTransport(url, { requestInit: { headers } }));
  return client;
}

type Result = { content: Array<{ text: string }> };
export const idsOf = (r: unknown): string[] =>
  (JSON.parse((r as Result).content[0]?.text ?? "{}") as { results: Array<{ address: string }> }).results.map((p) => p.address).sort();

export const call = async (client: Client, query = "needle") => client.callTool({ name: "search", arguments: { query } });

/** Tamper with the audit database behind the app's back. */
export function tamper(path: string, sql: string) {
  const h = new DatabaseSync(path);
  h.exec("DROP TRIGGER audit_no_update");
  h.exec("DROP TRIGGER audit_no_delete");
  h.exec(sql);
  h.close();
}
