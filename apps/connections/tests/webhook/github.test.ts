import { createHmac } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { skip } from "../../../../features/google-identity/tests/support/db.js";
import { validSignature } from "../../src/webhook/route.js";
import { boot, seed } from "../http/fixture.js";

const SECRET = "hook-secret";
const asked: string[] = [];
let s: Awaited<ReturnType<typeof boot>>;
beforeAll(async () => {
  if (!skip) s = await boot({ webhookSecret: SECRET, jobs: { requestSync: async (t, id, why, nonce) => void asked.push(`${t}:${id}:${why}:${nonce}`) } });
});
afterAll(() => s?.close());

const sign = (body: string, key = SECRET) => `sha256=${createHmac("sha256", key).update(body).digest("hex")}`;
const hook = (event: string, payload: object, o: { delivery?: string; key?: string; sig?: string } = {}) => {
  const body = JSON.stringify(payload);
  const headers: Record<string, string> = { "x-github-event": event, "x-hub-signature-256": o.sig ?? sign(body, o.key) };
  if (o.delivery) headers["x-github-delivery"] = o.delivery;
  return fetch(`${s.base}/v1/webhooks/github`, { method: "POST", body, headers });
};
const repo = { repository: { full_name: "acme/handbook" } };

describe.skipIf(skip)("POST /v1/webhooks/github", () => {
  it("checks the signature in constant time and rejects anything else", () => {
    expect(validSignature("k", "b", sign("b", "k"))).toBe(true);
    expect(validSignature("k", "b", sign("c", "k"))).toBe(false);
    expect(validSignature("k", "b", undefined)).toBe(false);
    expect(validSignature("k", "b", "sha256=short")).toBe(false);
  });
  it("answers 401 for a wrong or missing signature and queues nothing", async () => {
    expect((await hook("push", repo, { delivery: "x", key: "other" })).status).toBe(401);
    const none = await fetch(`${s.base}/v1/webhooks/github`, { method: "POST", body: "{}", headers: { "x-github-event": "push" } });
    expect(none.status).toBe(401);
    expect(asked).toEqual([]);
  });
  it("queues a sync for every active account naming the repository, in any tenant, and no other", async () => {
    const a = await seed(s, { repo: "acme/handbook" });
    const b = await seed(s, { tenant: "t2", repo: "acme/handbook" });
    await seed(s, { repo: "acme/other" });
    const gone = await seed(s, { repo: "acme/handbook" });
    s.store.setStatus("t1", gone.id, "needs-auth");
    const res = await hook("push", repo, { delivery: "d1" });
    expect(res.status).toBe(202);
    expect(await res.json()).toEqual({ queued: 2 });
    expect(asked.sort()).toEqual([`t1:${a.id}:webhook:d1`, `t2:${b.id}:webhook:d1`].sort());
    expect(await (await hook("push", repo, { delivery: "d1" })).json()).toEqual({ queued: 0 });
    expect(asked).toHaveLength(2);
    expect(await (await hook("issues", repo, { delivery: "d2" })).json()).toEqual({ queued: 2 });
  });
  it("answers ping 200, ignores other events with 202 and rejects a payload without delivery or repository with 400", async () => {
    expect(await (await hook("ping", {})).json()).toEqual({ ok: true });
    const star = await hook("star", repo, { delivery: "d3" });
    expect([star.status, await star.json()]).toEqual([202, { ignored: "star" }]);
    expect((await hook("push", repo)).status).toBe(400);
    expect((await hook("push", {}, { delivery: "d4" })).status).toBe(400);
    expect((await hook("push", { repository: { full_name: 5 } }, { delivery: "d5" })).status).toBe(400);
  });
});
