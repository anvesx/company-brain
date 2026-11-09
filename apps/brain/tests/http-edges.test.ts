import { createGraphStore } from "@anvesx/graph-store";
import { afterEach, describe, expect, it } from "vitest";
import { bootBrain, type Env, signUp, whoIs } from "./identity/boot.js";

const node = (tenant: string, id: string, kind: "person" | "document" | "team") => ({
  tenant,
  id,
  kind,
  source: "drive",
  address: id,
  title: id,
  version: "1",
  props: {},
});

let env: Env | undefined;
afterEach(async () => env?.close());

/** Boots the brain; Ann can read d1 and has a can-read edge to the team "eng". Returns a caller for her cookie. */
async function boot(store?: ReturnType<typeof createGraphStore>) {
  env = await bootBrain(store ? { store } : {});
  const ann = await signUp(env, "Ann");
  const { tenant, user } = await whoIs(env, ann.browser.cookie());
  for (const n of [node(tenant, user, "person"), node(tenant, "d1", "document"), node(tenant, "eng", "team")]) env.store.upsertNode(n, 1);
  for (const to of ["d1", "eng"]) env.store.addEdge({ tenant, from: user, to, kind: "can-read", source: "drive" }, 1);
  const get = (path: string, init: RequestInit = {}) =>
    fetch(`${env?.base}${path}`, { ...init, headers: { cookie: ann.browser.cookie(), ...(init.headers ?? {}) } });
  return { get, user };
}

describe("brain http edges", () => {
  it("answers errors as json with a message", async () => {
    const { get } = await boot();
    const bad = await fetch(`${env?.base}/v1/documents`);
    expect(bad.headers.get("content-type")).toBe("application/json");
    expect(await bad.json()).toMatchObject({ error: "unauthorized" });
    const post = await get("/v1/documents", { method: "POST" });
    expect(post.status).toBe(405);
    expect(await post.json()).toEqual({ error: "read only" });
    expect(await (await get("/v1/documents/nope")).json()).toEqual({ error: "not found" });
  });
  it("matches only the exact document paths", async () => {
    const { get } = await boot();
    expect((await get("/v1/documents/d1")).status).toBe(200);
    expect((await get("/v1/documents/d1/extra")).status).toBe(404);
    expect((await get("/x/v1/documents/d1")).status).toBe(404);
    expect((await get("/v1/documents/")).status).toBe(404);
  });
  it("hides non-document nodes even when readable", async () => {
    const { get, user } = await boot();
    expect((await get("/v1/documents/eng")).status).toBe(404);
    expect((await get(`/v1/documents/${user}`)).status).toBe(404);
  });
  it("serves json content type on success", async () => {
    const { get } = await boot();
    expect((await get("/v1/documents")).headers.get("content-type")).toBe("application/json");
  });
  it("answers 500 with a generic error when the store fails", async () => {
    // The app is given a store that is already closed, so every read throws.
    const broken = createGraphStore({ path: ":memory:" });
    broken.close();
    const { get } = await boot(broken);
    const r = await get("/v1/documents");
    expect(r.status).toBe(500);
    expect(await r.json()).toEqual({ error: "internal" });
  });
});
