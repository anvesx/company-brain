import { createHmac } from "node:crypto";
import { mkdtempSync, rmSync } from "node:fs";
import type { AddressInfo } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createGraphStore } from "@anvesx/graph-store";
import { afterEach, describe, expect, it } from "vitest";
import { createBrainApp } from "../src/app.js";
import type { Recheck } from "../src/live/recheck.js";

const SECRET = "s".repeat(32);
const auth = `Bearer ann:t:1100:${createHmac("sha256", SECRET).update("ann:t:1100").digest("hex")}`;
const cleanup: (() => Promise<void> | void)[] = [];
afterEach(async () => {
  for (const c of cleanup.splice(0)) await c();
});

async function boot(recheck?: Recheck) {
  const dir = mkdtempSync(join(tmpdir(), "brain-recheck-"));
  const store = createGraphStore({ path: join(dir, "g.db") });
  for (const [id, kind] of [
    ["ann", "person"],
    ["d1", "document"],
    ["d2", "document"],
  ] as const) {
    store.upsertNode({ tenant: "t", id, kind, source: "drive", address: `addr-${id}`, title: id, version: "1", props: {} }, 1);
  }
  for (const d of ["d1", "d2"]) store.addEdge({ tenant: "t", from: "ann", to: d, kind: "can-read", source: "drive" }, 1);
  const app = createBrainApp({ store, secret: SECRET, now: () => 1000, port: 0, ...(recheck ? { recheck } : {}) });
  await app.listen();
  cleanup.push(
    () => app.close(),
    () => store.close(),
    () => rmSync(dir, { recursive: true, force: true }),
  );
  return `http://127.0.0.1:${(app.server.address() as AddressInfo).port}`;
}
const get = (url: string) => fetch(url, { headers: { authorization: auth } });

describe("live permission recheck", () => {
  it("drops a document the source no longer lets the asker read, from the list and by id", async () => {
    const base = await boot(async (doc) => doc.id !== "d2");
    const list = (await (await get(`${base}/v1/documents`)).json()) as { documents: { id: string }[] };
    expect(list.documents.map((d) => d.id)).toEqual(["d1"]);
    expect((await get(`${base}/v1/documents/d2`)).status).toBe(404);
    expect((await get(`${base}/v1/documents/d1`)).status).toBe(200);
  });

  it("passes the document and the asker to the check", async () => {
    const seen: string[] = [];
    const base = await boot(async (doc, caller) => {
      seen.push(`${doc.source}:${doc.address}:${caller.user}:${caller.tenant}`);
      return true;
    });
    await get(`${base}/v1/documents/d1`);
    expect(seen).toEqual(["drive:addr-d1:ann:t"]);
  });

  it("fails closed when the check throws: hidden, never a 500", async () => {
    const base = await boot(async () => {
      throw new Error("source down");
    });
    const list = (await (await get(`${base}/v1/documents`)).json()) as { documents: unknown[] };
    expect(list.documents).toEqual([]);
    expect((await get(`${base}/v1/documents/d1`)).status).toBe(404);
  });

  it("changes nothing when no check is configured", async () => {
    const base = await boot();
    const list = (await (await get(`${base}/v1/documents`)).json()) as { documents: unknown[] };
    expect(list.documents).toHaveLength(2);
  });
});
