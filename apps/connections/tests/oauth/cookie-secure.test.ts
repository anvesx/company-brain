import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { ann } from "../http/fixture.js";
import { type Harness, harness } from "./harness.js";

let h: Harness;
beforeEach(async () => {
  h = await harness();
});
afterEach(() => h.close());

const start = (proto?: string) =>
  fetch(`${h.s.base}/v1/oauth/github/start`, { redirect: "manual", headers: { authorization: ann, ...(proto && { "x-forwarded-proto": proto }) } });

describe("oauth_bind cookie hardening", () => {
  it("behind https (x-forwarded-proto) it is Secure and carries the __Host- prefix with Path=/", async () => {
    const c = (await start("https")).headers.get("set-cookie") ?? "";
    expect(c).toMatch(/^__Host-oauth_bind=/);
    expect(c).toMatch(/;\s*Secure/i);
    expect(c).toMatch(/Path=\//i);
    expect(c).not.toMatch(/Domain=/i);
  });
  it("on plain http it keeps the bare name and is not Secure", async () => {
    const c = (await start()).headers.get("set-cookie") ?? "";
    expect(c).toMatch(/^oauth_bind=/);
    expect(c).not.toMatch(/Secure/i);
  });
  it("the https flow completes with the prefixed cookie and a bare-name cookie is not accepted", async () => {
    const r = await start("https");
    const back = new URL((await (await fetch(r.headers.get("location") ?? "", { redirect: "manual" })).headers.get("location")) ?? "");
    const pair = (r.headers.get("set-cookie") ?? "").split(";")[0] ?? "";
    const go = (cookie: string) => fetch(h.s.base + back.pathname + back.search, { headers: { cookie, "x-forwarded-proto": "https" } });
    expect((await go(pair.replace("__Host-", ""))).status).toBe(400);
    const r2 = await start("https");
    const back2 = new URL((await (await fetch(r2.headers.get("location") ?? "", { redirect: "manual" })).headers.get("location")) ?? "");
    const ok = await fetch(h.s.base + back2.pathname + back2.search, {
      headers: { cookie: (r2.headers.get("set-cookie") ?? "").split(";")[0] ?? "", "x-forwarded-proto": "https" },
    });
    expect(ok.status).toBe(201);
  });
});
