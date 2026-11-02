import { createHmac } from "node:crypto";
import type { AddressInfo } from "node:net";
import { createGraphStore } from "@brain/graph-store";
import { afterEach, describe, expect, it } from "vitest";
import { createBrainApp } from "../src/app.js";

const SECRET = "s".repeat(32);
const auth = `Bearer ann:t:500:${createHmac("sha256", SECRET).update("ann:t:500").digest("hex")}`;
const node = (id: string, kind: "person" | "document" | "team") => ({
  tenant: "t",
  id,
  kind,
  source: "drive",
  address: id,
  title: id,
  version: "1",
  props: {},
});

let close: (() => Promise<void>) | undefined;
afterEach(async () => close?.());

async function boot(store = createGraphStore({ path: ":memory:" })) {
  for (const n of [node("ann", "person"), node("d1", "document"), node("eng", "team")]) store.upsertNode(n, 1);
  store.addEdge({ tenant: "t", from: "ann", to: "d1", kind: "can-read", source: "drive" }, 1);
  store.addEdge({ tenant: "t", from: "ann", to: "eng", kind: "can-read", source: "drive" }, 1);
  const app = createBrainApp({ store, secret: SECRET, now: () => 0, port: 0 });
  await app.listen();
  close = app.close;
  const base = `http://127.0.0.1:${(app.server.address() as AddressInfo).port}`;
  return (path: string, init: RequestInit = {}) => fetch(base + path, { ...init, headers: { authorization: auth, ...(init.headers ?? {}) } });
}

describe("brain http edges", () => {
  it("answers errors as json with a message", async () => {
    const get = await boot();
    const bad = await fetch(
      new URL("/v1/documents", "http://127.0.0.1:1").href.replace(":1/", `:${(await get("/v1/documents")).url.split(":")[2]?.split("/")[0]}/`),
    );
    expect(bad.headers.get("content-type")).toBe("application/json");
    expect(await bad.json()).toEqual({ error: "unauthorized" });
    const post = await get("/v1/documents", { method: "POST" });
    expect(post.status).toBe(405);
    expect(await post.json()).toEqual({ error: "read only" });
    expect(await (await get("/v1/documents/nope")).json()).toEqual({ error: "not found" });
  });
  it("matches only the exact document paths", async () => {
    const get = await boot();
    expect((await get("/v1/documents/d1")).status).toBe(200);
    expect((await get("/v1/documents/d1/extra")).status).toBe(404);
    expect((await get("/x/v1/documents/d1")).status).toBe(404);
    expect((await get("/v1/documents/")).status).toBe(404);
  });
  it("hides non-document nodes even when readable", async () => {
    const get = await boot();
    expect((await get("/v1/documents/eng")).status).toBe(404);
    expect((await get("/v1/documents/ann")).status).toBe(404);
  });
  it("serves json content type on success", async () => {
    const get = await boot();
    expect((await get("/v1/documents")).headers.get("content-type")).toBe("application/json");
  });
  it("answers 500 with a generic error when the store fails", async () => {
    const store = createGraphStore({ path: ":memory:" });
    const get = await boot(store);
    store.close();
    const r = await get("/v1/documents");
    expect(r.status).toBe(500);
    expect(await r.json()).toEqual({ error: "internal" });
  });
  it("refuses a short or missing secret", () => {
    const store = createGraphStore({ path: ":memory:" });
    expect(() => createBrainApp({ store, secret: "short", now: () => 0 })).toThrow();
    expect(() => createBrainApp({ store, secret: undefined as unknown as string, now: () => 0 })).toThrow();
  });
});
