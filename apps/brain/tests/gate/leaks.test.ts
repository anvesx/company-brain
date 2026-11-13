import { createGraphStore, toAsync } from "@anvesx/graph-store";
import type { Caller as IdentityCaller } from "@anvesx/identity";
import { Hono } from "hono";
import { afterEach, describe, expect, it } from "vitest";
import type { Recheck } from "../../src/live/recheck.js";
import { mountDocuments } from "../../src/routes/documents.js";

// Leaks 1 to 3 on the real /v1/documents route over a real SQLite file: no check wired, a check that says no or throws, and zones.
let close: (() => void) | undefined;
afterEach(() => close?.());

async function list(props: Record<string, string>, recheck?: Recheck) {
  const graph = createGraphStore({ path: ":memory:" });
  close = () => graph.close();
  const who: IdentityCaller = { tenant: "t", user: "ann", kind: "session", scopes: [] };
  const n = (id: string, kind: "person" | "document", p: Record<string, string> = {}) => ({
    tenant: "t",
    id,
    kind,
    source: "drive",
    address: id,
    title: id,
    version: "1",
    props: p,
  });
  graph.upsertNode(n("ann", "person"), 1);
  graph.upsertNode(n("d1", "document", props), 1);
  graph.addEdge({ tenant: "t", from: "ann", to: "d1", kind: "can-read", source: "drive" }, 1);
  const app = new Hono();
  mountDocuments(app, { store: toAsync(graph), protect: (h) => (req) => h(req, who), aliases: async () => [], ...(recheck && { recheck }) });
  const ids = ((await (await app.request("/v1/documents")).json()) as { documents: { id: string }[] }).documents.map((d) => d.id);
  return { ids, byId: (await app.request("/v1/documents/d1")).status };
}

describe("permission leaks on /v1/documents", () => {
  it("leak 1: no live check wired hides the document, in the list and by id", async () => {
    expect(await list({ zone: "company" })).toEqual({ ids: [], byId: 404 });
  });
  it("leak 2: a check that says no, or throws, hides it", async () => {
    expect(await list({ zone: "company" }, async () => false)).toEqual({ ids: [], byId: 404 });
    expect(
      await list({ zone: "company" }, async () => {
        throw new Error("source down");
      }),
    ).toEqual({ ids: [], byId: 404 });
  });
  it("leak 3: a document with no zone, or in another person's personal zone, is hidden even when the source says yes", async () => {
    expect(await list({}, async () => true)).toEqual({ ids: [], byId: 404 });
    expect(await list({ zone: "personal", owner: "bob" }, async () => true)).toEqual({ ids: [], byId: 404 });
  });
  it("a company document the source still grants is listed and served", async () => {
    expect(await list({ zone: "company" }, async () => true)).toEqual({ ids: ["d1"], byId: 200 });
  });
});
