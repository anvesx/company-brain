import { SignJWT } from "jose";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { A, boot, type World } from "../support/world.js";

let w: World;
beforeAll(async () => {
  w = await boot();
  await w.file("f1", { title: "SENSITIVE-TITLE" });
});
afterAll(() => w.close());
const PATHS = ["/files", "/files/f1", "/clusters", "/clusters/c1", "/files?q=SENS"];
const none = (b: string) => expect(b).not.toContain("SENSITIVE-TITLE");

describe("auth", () => {
  it("no token, junk, empty and wrong scheme are 401 with no data", async () => {
    for (const p of PATHS) {
      for (const h of [undefined, "", "Bearer", "Bearer x.y.z", "Basic QWxhZGRpbjpvcGVu", "bearer  "]) {
        const r = await w.get(p, undefined, h === undefined ? {} : { headers: { authorization: h } });
        expect(r.status, `${p} ${h}`).toBe(401);
        none(r.body);
      }
    }
  });
  it("rejects wrong signing key, wrong audience, wrong issuer, expired and unknown kid", async () => {
    const bad = [
      await w.idp.sign(A, { key: "rogue" }),
      await w.idp.sign(A, { aud: "other" }),
      await w.idp.sign(A, { iss: "http://evil" }),
      await w.idp.sign(A, { exp: "-1m" }),
      await w.idp.sign(A, { kid: "nope" }),
    ];
    for (const t of bad) expect((await w.get("/files", t)).status).toBe(401);
  });
  it("rejects alg=none and HS256 signed with a public value", async () => {
    const none_ = `${Buffer.from('{"alg":"none"}').toString("base64url")}.${Buffer.from(JSON.stringify({ sub: "alice", tenant: "t1", iss: "http://files-view.test", aud: "files-view" })).toString("base64url")}.`;
    const hs = await new SignJWT({ tenant: "t1" })
      .setProtectedHeader({ alg: "HS256" })
      .setSubject("alice")
      .setIssuer("http://files-view.test")
      .setAudience("files-view")
      .setExpirationTime("5m")
      .sign(new TextEncoder().encode("k1"));
    for (const t of [none_, hs]) expect((await w.get("/files", t)).status).toBe(401);
  });
  it("a valid token with an empty tenant or empty subject is not served", async () => {
    expect((await w.get("/files", { tenant: "", user: "alice" })).status).toBeGreaterThanOrEqual(400);
    expect((await w.get("/files", { tenant: "t1", user: "" })).status).toBeGreaterThanOrEqual(400);
  });
  it("every response (200, 401, 404, 400) is no-store with a strict CSP", async () => {
    const rs = [await w.get("/files", A), await w.get("/files"), await w.get("/files/zzz", A), await w.get("/files?sort=bogus", A)];
    for (const r of rs) {
      expect(r.headers.get("cache-control"), String(r.status)).toMatch(/no-store/);
      const csp = r.headers.get("content-security-policy") ?? "";
      expect(csp).toMatch(/default-src 'none'|default-src 'self'/);
      expect(csp).not.toMatch(/unsafe-inline.*script|script-src[^;]*unsafe-(inline|eval)|\*/);
    }
  });
  it("401 on unauthenticated never redirects to a user-controlled URL", async () => {
    const r = await w.get("/files?next=http://evil.test", undefined);
    expect(r.headers.get("location") ?? "").not.toContain("evil.test");
  });
});
