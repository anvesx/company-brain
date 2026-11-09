import type { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { call, data, open } from "../support/client.js";
import { seedOrg, T0, T1 } from "../support/graph.js";
import { type BrainEnv, bootBrain } from "../support/server.js";
import { linkAccount, type Member, member } from "../support/users.js";

// Each tool once, through the real SDK client, the real identity OAuth token and a real graph file.
type Page = { nodes: { id: string; kind: string; group: string }[]; edges: { from: string; to: string }[]; next?: string };
let env: BrainEnv;
let ada: Member;
let client: Client;

beforeAll(async () => {
  env = await bootBrain();
  ada = await member(env, "Ada");
  seedOrg(env.store, ada.tenant, ada.userId, "u-bob");
  linkAccount(env, ada.userId, "github", { access: "gho_plainAccessValue", refresh: "ghr_plainRefreshValue" });
  ({ client } = await open(env.url, ada.token));
});
afterAll(async () => {
  await client?.close();
  await env?.close();
});

describe("brain-mcp tools", () => {
  it("lists exactly the four read tools", async () => {
    const { tools } = await client.listTools();
    expect(tools.map((t) => t.name).sort()).toEqual(["brain.connectors", "brain.graph", "brain.node", "brain.search"]);
    for (const t of tools) expect(t.outputSchema, t.name).toBeDefined();
  });

  it("brain.search finds visible titles only, with public fields only", async () => {
    const { nodes } = await data<{ nodes: Record<string, unknown>[] }>(client, "brain.search", { query: "quarterly" });
    expect(nodes.map((n) => n.id)).toEqual(["doc-plan"]);
    for (const n of nodes) for (const k of Object.keys(n)) expect(["id", "kind", "source", "title", "group"]).toContain(k);
  });

  it("brain.search answers an empty or blank query with INVALID_ARGUMENT", async () => {
    for (const query of ["", "   "]) {
      const r = await call(client, "brain.search", { query });
      expect(r.isError).toBe(true);
      expect(r.structuredContent).toMatchObject({ code: "INVALID_ARGUMENT" });
    }
  });

  it("brain.node returns the node and only edges whose both ends are visible", async () => {
    const r = await data<{ node: { id: string; title: string }; neighbours: { from: string; to: string }[] }>(client, "brain.node", { id: "doc-plan" });
    expect(r.node).toMatchObject({ id: "doc-plan", title: "Quarterly plan final" });
    expect(r.neighbours.map((e) => `${e.from}>${e.to}`).sort()).toEqual(["doc-plan>proj-atlas", "team-eng>doc-plan"]);
  });

  it("brain.node reads the past with asOf and is NOT_FOUND before the node existed", async () => {
    const old = await data<{ node: { title: string } }>(client, "brain.node", { id: "doc-plan", asOf: (T0 + T1) / 2 });
    expect(old.node.title).toBe("Quarterly plan draft");
    expect((await call(client, "brain.node", { id: "doc-plan", asOf: T0 - 1 })).structuredContent).toMatchObject({ code: "NOT_FOUND" });
  });

  it("brain.graph pages the visible graph by cursor", async () => {
    const all = await data<Page>(client, "brain.graph", {});
    expect(all.nodes.map((n) => n.id).sort()).toEqual([ada.userId, "doc-axb", "doc-num", "doc-pct", "doc-plan", "doc-und", "proj-atlas", "team-eng"].sort());
    expect(all.nodes.find((n) => n.id === "doc-plan")?.group).toBe("document:drive");
    const first = await data<Page>(client, "brain.graph", { limit: 3 });
    const second = await data<Page>(client, "brain.graph", { limit: 3, cursor: first.next });
    expect(first.nodes).toHaveLength(3);
    expect(first.next).toBeDefined();
    expect((second.nodes[0]?.id ?? "") > (first.nodes[2]?.id ?? "")).toBe(true);
  });

  it("brain.connectors lists linked providers with id, status and linkedAt only", async () => {
    const { providers } = await data<{ providers: Record<string, unknown>[] }>(client, "brain.connectors");
    expect(providers).toEqual([{ id: "github", status: "active", linkedAt: expect.anything() }]);
  });

  it("serves a visible node as the brain://node/{id} resource", async () => {
    const { contents } = await client.readResource({ uri: "brain://node/doc-plan" });
    expect(contents[0]).toMatchObject({ uri: "brain://node/doc-plan", mimeType: "application/json" });
    expect(JSON.parse(String((contents[0] as { text: string }).text))).toMatchObject({ id: "doc-plan" });
  });
});
