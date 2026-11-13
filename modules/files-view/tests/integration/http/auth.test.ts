import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { boot, type Env, ids } from "../support/app.js";
import { doc } from "../support/world.js";

let env: Env;
const me = { tenant: "h", user: "alice" };
beforeAll(async () => {
  env = await boot();
  await env.store.upsertNode(doc("h", "d1", 1, { zone: "company", owner: "alice" }), 1);
  await env.store.upsertNode({ ...doc("h", "d2", 2, { zone: "company", owner: "alice" }), title: "<script>alert(1)</script>" }, 1);
  for (const d of ["d1", "d2"]) await env.store.addEdge({ tenant: "h", from: "alice", to: d, kind: "can-read", source: "t" }, 1);
}, 120_000);
afterAll(async () => env.stop(), 120_000);

const PATHS = ["/files", "/files/d1", "/clusters", "/clusters/x"];
describe("authentication against a real JWKS endpoint", () => {
  for (const p of PATHS)
    it(`no token on ${p} is 401 with no data`, async () => {
      const r = await env.call(p);
      expect(r.status).toBe(401);
      expect(r.body).not.toMatch(/Doc 001|d1/);
    });
  const claims = me;
  const tokens: [string, () => Promise<string>][] = [
    ["garbage", async () => "not.a.jwt"],
    ["forged signature", () => env.oidc.forged(claims)],
    ["expired", () => env.oidc.expired(claims)],
    ["wrong issuer", () => env.oidc.wrongIssuer(claims)],
  ];
  for (const [name, mk] of tokens)
    it(`${name} token is 401 with no data`, async () => {
      const r = await env.call("/files", await mk());
      expect(r.status).toBe(401);
      expect(ids(r.body)).toEqual([]);
    });
  it("a valid token lists the file", async () => expect(ids((await env.call("/files", me)).body).sort()).toEqual(["d1", "d2"]));
  it("identity headers are not trusted without a token", async () => {
    const r = await fetch(`${env.base}/files`, { headers: { "x-user": "alice", "x-tenant": "h", "x-forwarded-user": "alice" } });
    expect(r.status).toBe(401);
  });
  it("identity headers cannot override a valid token", async () => {
    const token = await env.oidc.token({ tenant: "other", user: "mallory" });
    const r = await fetch(`${env.base}/files`, { headers: { authorization: `Bearer ${token}`, "x-tenant": "h", "x-user": "alice" } });
    expect(ids(await r.text())).toEqual([]);
  });
  it("a session cookie alone does not authenticate", async () => {
    expect((await fetch(`${env.base}/files`, { headers: { cookie: "session=alice" } })).status).toBe(401);
  });
});
describe("response hardening", () => {
  for (const p of ["/files", "/files/d1", "/clusters"])
    it(`${p} has a strict CSP and no-store`, async () => {
      const r = await env.call(p, me);
      const csp = r.headers.get("content-security-policy") ?? "";
      expect(csp).toMatch(/default-src/);
      expect(csp).not.toMatch(/script-src[^;]*'unsafe-(inline|eval)'/);
      expect(csp).not.toMatch(/\*/);
      expect(r.headers.get("cache-control")).toMatch(/no-store/);
    });
  it("401 and 404 responses are also no-store", async () => {
    for (const r of [await env.call("/files"), await env.call("/files/nope", me)]) expect(r.headers.get("cache-control")).toMatch(/no-store/);
  });
  it("titles are HTML-escaped", async () => {
    const r = await env.call("/files", me);
    expect(r.body).not.toContain("<script>alert(1)</script>");
    expect(r.body).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
    expect((await env.call("/files/d2", me)).body).not.toContain("<script>alert(1)");
  });
  it("is text/html", async () => expect((await env.call("/files", me)).headers.get("content-type")).toMatch(/text\/html/));
});
