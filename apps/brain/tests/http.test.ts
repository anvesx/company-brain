import { createHmac } from "node:crypto";
import type { AddressInfo } from "node:net";
import { createGraphStore } from "@brain/graph-store";
import { afterEach, describe, expect, it } from "vitest";
import { createBrainApp } from "../src/app.js";

const SECRET = "s".repeat(32);
const NOW = 1_000;
const token = (user: string, tenant = "t", exp = NOW + 100, key = SECRET) =>
  `Bearer ${user}:${tenant}:${exp}:${createHmac("sha256", key).update(`${user}:${tenant}:${exp}`).digest("hex")}`;

let close: (() => Promise<void>) | undefined;
afterEach(async () => close?.());

async function boot() {
  const store = createGraphStore({ path: ":memory:" });
  const n = (id: string, kind: "person" | "document") => ({
    tenant: "t",
    id,
    kind,
    source: "drive",
    address: `addr-${id}`,
    title: id,
    version: "1",
    props: {},
  });
  for (const x of [n("ann", "person"), n("d1", "document"), n("d2", "document")]) store.upsertNode(x, 1);
  store.addEdge({ tenant: "t", from: "ann", to: "d1", kind: "can-read", source: "drive" }, 1);
  const app = createBrainApp({ store, secret: SECRET, now: () => NOW, port: 0 });
  await app.listen();
  close = app.close;
  return `http://127.0.0.1:${(app.server.address() as AddressInfo).port}`;
}
const get = (url: string, auth?: string) => fetch(url, { headers: auth ? { authorization: auth } : {} });

describe("brain http", () => {
  it("rejects missing, forged, expired and cross-key tokens", async () => {
    const base = await boot();
    expect((await get(`${base}/v1/documents`)).status).toBe(401);
    expect((await get(`${base}/v1/documents`, token("ann", "t", NOW + 100, "x".repeat(32)))).status).toBe(401);
    expect((await get(`${base}/v1/documents`, token("ann", "t", NOW - 1))).status).toBe(401);
  });
  it("lists pointers only, for the caller", async () => {
    const base = await boot();
    const body = await (await get(`${base}/v1/documents`, token("ann"))).json();
    expect(body).toEqual({ documents: [{ id: "d1", source: "drive", address: "addr-d1", title: "d1", version: "1" }] });
  });
  it("returns 404 for a document the caller cannot read, same as a missing one", async () => {
    const base = await boot();
    expect((await get(`${base}/v1/documents/d2`, token("ann"))).status).toBe(404);
    expect((await get(`${base}/v1/documents/nope`, token("ann"))).status).toBe(404);
    expect((await get(`${base}/v1/documents/d1`, token("ann"))).status).toBe(200);
  });
  it("never leaks another tenant", async () => {
    const base = await boot();
    const body = await (await get(`${base}/v1/documents`, token("ann", "other"))).json();
    expect(body).toEqual({ documents: [] });
  });
  it("answers 404 on unknown routes and 405 on writes", async () => {
    const base = await boot();
    expect((await get(`${base}/v2/x`, token("ann"))).status).toBe(404);
    expect((await fetch(`${base}/v1/documents`, { method: "POST", headers: { authorization: token("ann") } })).status).toBe(405);
  });
  it("refuses a short secret", () => {
    expect(() => createBrainApp({ store: createGraphStore({ path: ":memory:" }), secret: "short", now: () => 0 })).toThrow(/32/);
  });
});
