import { afterEach, describe, expect, it } from "vitest";
import { bearer, bootBrain, connect, type Env, seedDocs, signUp, whoIs } from "./boot.js";

let env: Env | undefined;
afterEach(async () => env?.close());

type Page = { nodes: { id: string; group: string }[]; edges: { from: string; to: string; kind: string }[] };

// The brain mounts @anvesx/graph-view on the same origin as identity, so the session cookie that
// signed the person in also opens /graph and /v1/graph.
describe("brain mounts the graph view", () => {
  it("answers /v1/graph for a signed-in browser with only what that person can read", async () => {
    env = await bootBrain();
    const ann = await signUp(env, "Ann");
    const who = await whoIs(env, ann.browser.cookie());
    seedDocs(env.store, who.tenant, who.user);
    const res = await fetch(`${env.base}/v1/graph`, { headers: { cookie: ann.browser.cookie() } });
    expect(res.status).toBe(200);
    const page = (await res.json()) as Page;
    expect(page.nodes.map((n) => n.id).sort()).toEqual(["d-1", who.user].sort());
    expect(page.edges).toEqual([{ from: who.user, to: "d-1", kind: "can-read" }]);
  });

  // An MCP client carries an OAuth bearer instead of the cookie. The guard behind /v1/graph must map it to the
  // same person, so the visible set is identical, and a bearer whose signature is wrong must get the 401.
  it("answers /v1/graph for the bearer identity issued with the same visible set, and 401s a forged one", async () => {
    env = await bootBrain();
    const ann = await signUp(env, "Ann");
    const who = await whoIs(env, ann.browser.cookie());
    seedDocs(env.store, who.tenant, who.user);
    const token = (await connect(ann.browser, env.base, `${env.base}/mcp`)).tokens.access_token;
    const res = await fetch(`${env.base}/v1/graph`, { headers: bearer(token) });
    expect(res.status).toBe(200);
    const page = (await res.json()) as Page;
    expect(page.nodes.map((n) => n.id).sort()).toEqual(["d-1", who.user].sort());
    const forged = await fetch(`${env.base}/v1/graph`, { headers: bearer(`${token.slice(0, -4)}${token.endsWith("AAAA") ? "BBBB" : "AAAA"}`) });
    expect(forged.status).toBe(401);
    expect(forged.headers.get("www-authenticate")).toContain("resource_metadata=");
  });

  it("answers /v1/graph with 401 and the challenge header when nobody is signed in", async () => {
    env = await bootBrain();
    const res = await fetch(`${env.base}/v1/graph`);
    expect(res.status).toBe(401);
    expect(res.headers.get("www-authenticate")).toContain("resource_metadata=");
  });

  it("serves the /graph page shell to a signed-in browser and sends others to sign in", async () => {
    env = await bootBrain();
    const ann = await signUp(env, "Ann");
    const page = await fetch(`${env.base}/graph`, { headers: { cookie: ann.browser.cookie() }, redirect: "manual" });
    expect(page.status).toBe(200);
    expect(await page.text()).toContain('id="graph"');
    const anon = await fetch(`${env.base}/graph`, { redirect: "manual" });
    expect(anon.status).toBe(302);
    expect(anon.headers.get("location")).toContain("/sign-in");
  });
});
