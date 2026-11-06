import { afterEach, describe, expect, it } from "vitest";
import { bearer, bootBrain, connect, type Env, seedDocs, signUp, whoIs } from "./boot.js";

let env: Env | undefined;
afterEach(async () => env?.close());

type Pointer = { id: string; title: string };
const docs = async (res: Response) => ((await res.json()) as { documents: Pointer[] }).documents;
const ids = async (res: Response) => (await docs(res)).map((d) => d.id);
const titles = async (who: { browser: { cookie(): string } }) =>
  (await docs(await fetch(`${env?.base}/v1/documents`, { headers: { cookie: who.browser.cookie() } }))).map((d) => d.title);

// Amended by the lead: 401 bodies are identity's { error, code }. ADR 0008: the brain trusts identity's port, not its own HMAC bearer. Every answer below goes
// through identity.protect: a browser session or an MCP access token, or 401 with the challenge.
describe("brain /v1/documents behind identity", () => {
  it("answers 401 with the MCP challenge header when there is no caller", async () => {
    env = await bootBrain();
    const res = await fetch(`${env.base}/v1/documents`);
    expect(res.status).toBe(401);
    expect(res.headers.get("www-authenticate")).toBe(`Bearer resource_metadata="${env.base}/.well-known/oauth-protected-resource/mcp"`);
    expect(await res.json()).toMatchObject({ error: "unauthorized" });
  });

  it("answers 401 for the old hand-signed bearer format and for a made-up token", async () => {
    env = await bootBrain();
    const old = `Bearer ann:t:${Date.now() + 60_000}:${"a".repeat(64)}`;
    for (const auth of [old, "Bearer not-a-jwt"]) {
      const res = await fetch(`${env.base}/v1/documents`, { headers: { authorization: auth } });
      expect(res.status).toBe(401);
      expect(res.headers.get("www-authenticate")).toContain("resource_metadata=");
    }
  });

  it("answers a signed-in browser from its session cookie, with only the documents it can read", async () => {
    env = await bootBrain();
    const ann = await signUp(env, "Ann");
    const who = await whoIs(env, ann.browser.cookie());
    seedDocs(env.store, who.tenant, who.user);
    const res = await fetch(`${env.base}/v1/documents`, { headers: { cookie: ann.browser.cookie() } });
    expect(res.status).toBe(200);
    expect(await ids(res)).toEqual(["d-1"]);
  });

  it("answers an MCP client from the bearer token identity issued, with the same documents", async () => {
    env = await bootBrain();
    const ann = await signUp(env, "Ann");
    const who = await whoIs(env, ann.browser.cookie());
    seedDocs(env.store, who.tenant, who.user);
    const { tokens } = await connect(ann.browser, env.base, `${env.base}/mcp`);
    const res = await fetch(`${env.base}/v1/documents`, { headers: bearer(tokens.access_token) });
    expect(res.status).toBe(200);
    expect(await ids(res)).toEqual(["d-1"]);
  });

  it("serves one document to its reader and 404s the one in the same tenant nobody gave them", async () => {
    env = await bootBrain();
    const ann = await signUp(env, "Ann");
    const who = await whoIs(env, ann.browser.cookie());
    seedDocs(env.store, who.tenant, who.user);
    const get = (id: string) => fetch(`${env?.base}/v1/documents/${id}`, { headers: { cookie: ann.browser.cookie() } });
    const ok = await get("d-1");
    expect(ok.status).toBe(200);
    expect(((await ok.json()) as Pointer).title).toBe("title of d-1");
    expect((await get("d-2")).status).toBe(404);
  });

  it("keeps tenants apart: a second person sees none of the first person's documents", async () => {
    env = await bootBrain();
    const ann = await signUp(env, "Ann");
    const a = await whoIs(env, ann.browser.cookie());
    seedDocs(env.store, a.tenant, a.user);
    const bob = await signUp(env, "Bob");
    const b = await whoIs(env, bob.browser.cookie());
    // Amended by the lead: Bob's tenant holds its own readable "d-1", so this cannot pass on empty input.
    seedDocs(env.store, b.tenant, b.user);
    env.store.upsertNode({ tenant: b.tenant, id: "d-1", kind: "document", source: "drive", address: "bob", title: "Bob's d-1", version: "1", props: {} }, 2);
    expect(await titles(ann)).toEqual(["title of d-1"]);
    expect(await titles(bob)).toEqual(["Bob's d-1"]);
  });
});
