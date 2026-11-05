import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { ann, bob, boot, pat, root } from "../fixture.js";

let s: Awaited<ReturnType<typeof boot>>;
beforeEach(async () => {
  s = await boot();
});
afterEach(() => s.close());

describe("PATCH and DELETE /v1/accounts/:id", () => {
  const make = async (who: string, body: object = pat) => ((await (await s.call("POST", "/v1/accounts", who, body)).json()) as { id: string }).id;
  it("changes label and zones for the owner", async () => {
    const id = await make(ann);
    const r = await s.call("PATCH", `/v1/accounts/${id}`, ann, { label: "new", access: "personal" });
    expect(await r.json()).toMatchObject({ label: "new", access: "personal", dataZone: "private" });
  });
  it("answers 403 when a patch would widen a pat account for a non-admin", async () => {
    const id = await make(ann);
    const r = await s.call("PATCH", `/v1/accounts/${id}`, ann, { access: "company" });
    expect(r.status).toBe(403);
    expect(s.store.get("t1", id)?.access).toBe("private");
  });
  it("answers 400 for unknown fields or an empty patch", async () => {
    const id = await make(ann);
    expect((await s.call("PATCH", `/v1/accounts/${id}`, ann, { owner: "bob" })).status).toBe(400);
    expect((await s.call("PATCH", `/v1/accounts/${id}`, ann, {})).status).toBe(400);
  });
  it("hides another owner's private account (404) and refuses to edit a visible company one (403)", async () => {
    const priv = await make(ann);
    const shared = await make(root, { ...pat, access: "company", dataZone: "company" });
    expect((await s.call("PATCH", `/v1/accounts/${priv}`, bob, { label: "x" })).status).toBe(404);
    expect((await s.call("DELETE", `/v1/accounts/${priv}`, bob)).status).toBe(404);
    expect((await s.call("PATCH", `/v1/accounts/${shared}`, bob, { label: "x" })).status).toBe(403);
    expect((await s.call("DELETE", `/v1/accounts/${shared}`, bob)).status).toBe(403);
  });
  it("fails closed: widening an account whose manifest is gone answers 403 even for an admin", async () => {
    const orphan = s.store.create({
      provider: "gone-custom",
      label: "x",
      kind: "pat",
      access: "private",
      dataZone: "private",
      tenant: "t1",
      owner: "root",
      secret: "tok",
    });
    const r = await s.call("PATCH", `/v1/accounts/${orphan.id}`, root, { access: "company" });
    expect(r.status).toBe(403);
    expect(s.store.get("t1", orphan.id)?.access).toBe("private");
    expect((await s.call("PATCH", `/v1/accounts/${orphan.id}`, root, { label: "renamed" })).status).toBe(200);
  });
  it("deletes the account and its credential for the owner", async () => {
    const id = await make(ann);
    expect((await s.call("DELETE", `/v1/accounts/${id}`, ann)).status).toBe(204);
    expect(s.store.credential("t1", id)).toBeUndefined();
    expect((await s.call("DELETE", `/v1/accounts/${id}`, ann)).status).toBe(404);
  });
});
