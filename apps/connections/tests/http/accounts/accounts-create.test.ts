import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { ann, bob, boot, mint, pat, root } from "../fixture.js";

let s: Awaited<ReturnType<typeof boot>>;
beforeEach(async () => {
  s = await boot();
});
afterEach(() => s.close());

describe("POST /v1/accounts", () => {
  it("creates an account owned by the caller and never echoes the token", async () => {
    const r = await s.call("POST", "/v1/accounts", ann, pat);
    expect(r.status).toBe(201);
    const text = await r.text();
    expect(text).not.toContain("ghp_secret");
    expect(JSON.parse(text)).toMatchObject({ owner: "ann", tenant: "t1", provider: "github", kind: "pat", status: "active" });
  });
  it("answers 403 with the reason when a non-admin asks for company", async () => {
    const r = await s.call("POST", "/v1/accounts", ann, { ...pat, dataZone: "company" });
    expect(r.status).toBe(403);
    expect(((await r.json()) as { error: string }).error).toMatch(/dataZone company/);
    expect(s.store.listVisible({ user: "ann", tenant: "t1" })).toHaveLength(0);
  });
  it("lets a tenant admin create a company pat account", async () => {
    const r = await s.call("POST", "/v1/accounts", root, { ...pat, access: "company", dataZone: "company" });
    expect(r.status).toBe(201);
  });
  it.each([
    [{ ...pat, provider: "unknown-app" }],
    [{ ...pat, label: "" }],
    [{ ...pat, token: "" }],
    [{ ...pat, kind: "oauth" }],
    [{ ...pat, access: "everyone" }],
    [{ ...pat, owner: "bob" }],
  ])("answers 400 for an invalid body %#", async (body) => {
    expect((await s.call("POST", "/v1/accounts", ann, body)).status).toBe(400);
  });
  it("answers 401 without a valid bearer", async () => {
    expect((await s.call("POST", "/v1/accounts", undefined, pat)).status).toBe(401);
    expect((await s.call("POST", "/v1/accounts", mint("ann", "t1", 1), pat)).status).toBe(401);
  });
});

describe("GET /v1/accounts", () => {
  it("shows the owner their accounts and company ones, without credentials", async () => {
    await s.call("POST", "/v1/accounts", ann, pat);
    await s.call("POST", "/v1/accounts", bob, { ...pat, label: "bob-private" });
    await s.call("POST", "/v1/accounts", root, { ...pat, label: "shared", access: "company", dataZone: "company" });
    const text = await (await s.call("GET", "/v1/accounts", ann)).text();
    expect(text).not.toContain("ghp_secret");
    const labels = (JSON.parse(text) as { accounts: { label: string }[] }).accounts.map((a) => a.label).sort();
    expect(labels).toEqual(["shared", "work"]);
  });
  it("hides a company account from another tenant", async () => {
    await s.call("POST", "/v1/accounts", root, { ...pat, access: "company", dataZone: "company" });
    const r = await s.call("GET", "/v1/accounts", mint("eve", "t2"));
    expect(((await r.json()) as { accounts: unknown[] }).accounts).toEqual([]);
  });
});
