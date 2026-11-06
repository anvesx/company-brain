import { afterEach, describe, expect, it } from "vitest";
import { bootBrain, type Env, seedDocs, signUp, whoIs } from "./identity/boot.js";

let env: Env | undefined;
afterEach(async () => env?.close());

/** Boots the brain, signs Ann up through identity and gives her one readable document. */
async function boot() {
  env = await bootBrain();
  const ann = await signUp(env, "Ann");
  const who = await whoIs(env, ann.browser.cookie());
  seedDocs(env.store, who.tenant, who.user);
  const get = (path: string, init: RequestInit = {}) => fetch(`${env?.base}${path}`, { headers: { cookie: ann.browser.cookie() }, ...init });
  return { get, ann };
}

describe("brain http", () => {
  it("rejects a missing credential and a forged bearer", async () => {
    await boot();
    expect((await fetch(`${env?.base}/v1/documents`)).status).toBe(401);
    expect((await fetch(`${env?.base}/v1/documents`, { headers: { authorization: `Bearer ann:t:9999999999:${"a".repeat(64)}` } })).status).toBe(401);
  });
  it("lists pointers only, for the caller", async () => {
    const { get } = await boot();
    const body = await (await get("/v1/documents")).json();
    expect(body).toEqual({ documents: [{ id: "d-1", source: "drive", address: "https://drive.example.com/d-1", title: "title of d-1", version: "1" }] });
  });
  it("returns 404 for a document the caller cannot read, same as a missing one", async () => {
    const { get } = await boot();
    expect((await get("/v1/documents/d-2")).status).toBe(404);
    expect((await get("/v1/documents/nope")).status).toBe(404);
    expect((await get("/v1/documents/d-1")).status).toBe(200);
  });
  it("never leaks another tenant: each person sees only their own tenant's document, though both are called d-1", async () => {
    const { ann } = await boot();
    const bob = await signUp(env as Env, "Bob");
    const b = await whoIs(env as Env, bob.browser.cookie());
    // Same document id in the second tenant, with a different title, so mixing the tenants would show.
    env?.store.upsertNode(
      { tenant: b.tenant, id: "d-1", kind: "document", source: "drive", address: "bob-addr", title: "Bob's d-1", version: "1", props: {} },
      1,
    );
    env?.store.upsertNode({ tenant: b.tenant, id: b.user, kind: "person", source: "drive", address: b.user, title: "Bob", version: "1", props: {} }, 1);
    env?.store.addEdge({ tenant: b.tenant, from: b.user, to: "d-1", kind: "can-read", source: "drive" }, 1);
    const titles = async (who: typeof ann) => {
      const res = await fetch(`${env?.base}/v1/documents`, { headers: { cookie: who.browser.cookie() } });
      return ((await res.json()) as { documents: { title: string }[] }).documents.map((d) => d.title);
    };
    expect(await titles(ann)).toEqual(["title of d-1"]);
    expect(await titles(bob)).toEqual(["Bob's d-1"]);
  });
  it("answers 404 on unknown routes and 405 on writes", async () => {
    const { get } = await boot();
    expect((await get("/v2/x")).status).toBe(404);
    expect((await fetch(`${env?.base}/v1/documents`, { method: "POST" })).status).toBe(401);
  });
  it("answers 405 to a signed-in write", async () => {
    const { get, ann } = await boot();
    const res = await get("/v1/documents", { method: "POST", headers: { cookie: ann.browser.cookie() } });
    expect(res.status).toBe(405);
    expect(await res.json()).toEqual({ error: "read only" });
  });
});
