import { afterEach, describe, expect, it } from "vitest";
import { boot, root } from "../http/fixture.js";

const spec = { id: "wiki", name: "Wiki", auth: { kind: "token" }, endpoint: "https://wiki.example.com/c" };
const acct = (provider: string, extra: object = {}) => ({ provider, label: "w", kind: "pat", token: "t", ...extra });
let s: Awaited<ReturnType<typeof boot>>;
afterEach(() => s.close());

describe("a custom connector gets no extra trust", () => {
  it("without canRead cannot be company, even for a tenant admin, but can be personal", async () => {
    s = await boot();
    await s.call("POST", "/v1/catalog", root, spec);
    for (const wide of [{ dataZone: "company" }, { access: "company" }]) {
      const r = await s.call("POST", "/v1/accounts", root, acct("wiki", wide));
      expect(r.status).toBe(403);
      expect(((await r.json()) as { error: string }).error).toMatch(/canRead/);
    }
    const ok = await s.call("POST", "/v1/accounts", root, acct("wiki", { access: "personal", dataZone: "personal" }));
    expect(ok.status).toBe(201);
    const { id } = (await ok.json()) as { id: string };
    expect((await s.call("PATCH", `/v1/accounts/${id}`, root, { dataZone: "company" })).status).toBe(403);
    expect((await s.call("PATCH", `/v1/accounts/${id}`, root, { dataZone: "personal" })).status).toBe(200);
  });
  it("with canRead follows the ordinary widening rule", async () => {
    s = await boot();
    await s.call("POST", "/v1/catalog", root, { ...spec, canRead: true });
    expect((await s.call("POST", "/v1/accounts", root, acct("wiki", { dataZone: "company" }))).status).toBe(201);
  });
  it("still obeys the ordinary rule for a non-admin owner", async () => {
    s = await boot();
    await s.call("POST", "/v1/catalog", root, { ...spec, canRead: true });
    const ann = (await import("../http/fixture.js")).ann;
    expect((await s.call("POST", "/v1/accounts", ann, acct("wiki", { dataZone: "company" }))).status).toBe(403);
  });
});
