import { createGraphStore, toAsync } from "@anvesx/graph-store";
import type { Caller as IdentityCaller } from "@anvesx/identity";
import { Hono } from "hono";
import { afterEach, describe, expect, it } from "vitest";
import type { Recheck } from "../src/live/recheck.js";
import { mountDocuments } from "../src/routes/documents.js";

let close: (() => void) | undefined;
afterEach(() => close?.());

/** Mounts the real routes with Ann able to read d1 and d2, without opening a sandbox-blocked socket. */
async function boot(recheck?: Recheck) {
  const graph = createGraphStore({ path: ":memory:" });
  close = () => graph.close();
  const caller: IdentityCaller = { tenant: "t", user: "ann", kind: "session", scopes: [] };
  const n = (id: string, kind: "person" | "document") => ({
    tenant,
    id,
    kind,
    source: "drive",
    address: `addr-${id}`,
    title: id,
    version: "1",
    props: kind === "document" ? { zone: "company" } : {},
  });
  const { tenant, user } = caller;
  for (const x of [n(user, "person"), n("d1", "document"), n("d2", "document")]) graph.upsertNode(x, 1);
  for (const d of ["d1", "d2"]) graph.addEdge({ tenant, from: user, to: d, kind: "can-read", source: "drive" }, 1);
  const protect = (handler: (req: Request, who: IdentityCaller) => Promise<Response>) => (req: Request) => handler(req, caller);
  const app = new Hono();
  mountDocuments(app, { store: toAsync(graph), protect, aliases: async () => [], ...(recheck && { recheck }) });
  return { get: (path: string) => app.request(path), user, tenant };
}

describe("live permission recheck", () => {
  it("drops a document the source no longer lets the asker read, from the list and by id", async () => {
    const { get } = await boot(async (doc) => doc.id !== "d2");
    const list = (await (await get("/v1/documents")).json()) as { documents: { id: string }[] };
    expect(list.documents.map((d) => d.id)).toEqual(["d1"]);
    expect((await get("/v1/documents/d2")).status).toBe(404);
    expect((await get("/v1/documents/d1")).status).toBe(200);
  });

  it("passes the document and the asker to the check", async () => {
    const seen: string[] = [];
    const { get, user, tenant } = await boot(async (doc, caller) => {
      seen.push(`${doc.source}:${doc.address}:${caller.user}:${caller.tenant}`);
      return true;
    });
    await get("/v1/documents/d1");
    expect(seen).toEqual([`drive:addr-d1:${user}:${tenant}`]);
  });

  it("fails closed when the check throws: hidden, never a 500", async () => {
    const { get } = await boot(async () => {
      throw new Error("source down");
    });
    const list = (await (await get("/v1/documents")).json()) as { documents: unknown[] };
    expect(list.documents).toEqual([]);
    expect((await get("/v1/documents/d1")).status).toBe(404);
  });

  it("fails closed when no check is configured", async () => {
    const { get } = await boot();
    const list = (await (await get("/v1/documents")).json()) as { documents: unknown[] };
    expect(list.documents).toEqual([]);
    expect((await get("/v1/documents/d1")).status).toBe(404);
  });
});
