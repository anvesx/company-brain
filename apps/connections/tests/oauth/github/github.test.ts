import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { ann, root } from "../../http/fixture.js";
import { type Harness, harness, redirect } from "../harness.js";

let h: Harness;
beforeEach(async () => {
  h = await harness();
});
afterEach(() => h.close());

describe("github oauth against the replay provider", () => {
  it("start redirects to the provider with client, redirect and state; callback creates the account", async () => {
    const f = await h.signIn(ann, "github", "?label=mine&access=personal");
    expect(f.start.origin).toBe(h.replay.url);
    expect(f.start.searchParams.get("client_id")).toBe("cid");
    expect(f.start.searchParams.get("redirect_uri")).toBe(redirect("github"));
    const r = await f.callback();
    expect(r.status).toBe(201);
    const text = await r.text();
    expect(text).not.toContain("at_");
    expect(JSON.parse(text)).toMatchObject({ owner: "ann", provider: "github", kind: "oauth", label: "mine", access: "personal", dataZone: "private" });
  });
  it("then lists, patches and deletes over HTTP", async () => {
    const f = await h.signIn(ann, "github");
    const { id } = (await (await f.callback()).json()) as { id: string };
    const list = (await (await h.s.call("GET", "/v1/accounts", ann)).json()) as { accounts: { id: string }[] };
    expect(list.accounts.map((a) => a.id)).toEqual([id]);
    expect((await h.s.call("PATCH", `/v1/accounts/${id}`, ann, { label: "renamed" })).status).toBe(200);
    expect((await h.s.call("DELETE", `/v1/accounts/${id}`, ann)).status).toBe(204);
    expect(await (await h.s.call("GET", "/v1/accounts", ann)).json()).toEqual({ accounts: [] });
  });
  it("seals the access token the provider issued in the vault, not in the account row", async () => {
    const f = await h.signIn(ann, "github");
    const { id } = (await (await f.callback()).json()) as { id: string };
    expect((await h.s.vault.get("t1", id))?.token.accessToken).toBe(`at_${f.back.searchParams.get("code")}`);
    expect(JSON.stringify(h.s.store.get("t1", id))).not.toContain("at_");
  });
  it("queues a sync of the new account right after the callback", async () => {
    const asked: string[] = [];
    const w = await harness({}, undefined, { jobs: { requestSync: async (_t, id, why) => !!asked.push(`${why}:${id}`) } });
    const { id } = (await (await (await w.signIn(ann, "github")).callback()).json()) as { id: string };
    expect(asked).toEqual([`connect:${id}`]);
    await w.close();
  });
  it("refuses a company zone for a non-admin at start, and allows it for an admin", async () => {
    expect((await h.s.call("GET", "/v1/oauth/github/start?dataZone=company", ann)).status).toBe(403);
    expect((await h.s.call("GET", "/v1/oauth/github/start?dataZone=company", root)).status).toBe(302);
  });
});
