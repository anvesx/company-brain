import { afterEach, describe, expect, it } from "vitest";
import type { NewAccount } from "../../src/accounts/types.js";
import { oauthProvider } from "../../src/oauth/providers.js";
import { ann, root, seed } from "../http/fixture.js";
import { startReplay } from "../oauth/replay-provider.js";
import { bootSync } from "./fixture.js";

let h: Awaited<ReturnType<typeof bootSync>> | undefined;
afterEach(async () => {
  await h?.close();
  h = undefined;
});
const cur = () => h as NonNullable<typeof h>;
const mk = (extra: Partial<NewAccount> = {}, token?: Parameters<typeof seed>[2]) => seed(cur().s, extra, token);
const sync = (id: string, who = root, b: unknown = { repo: "acme/handbook" }) => cur().s.call("POST", `/v1/accounts/${id}/sync`, who, b);
const body = async (r: Response) => ({ status: r.status, json: await r.json() });

describe("sync error bodies", () => {
  it("says what is wrong in each refusal", async () => {
    h = await bootSync();
    const a = await mk();
    expect(await body(await sync("nope"))).toEqual({ status: 404, json: { error: "not found" } });
    const shared = await mk({ access: "company" });
    expect(await body(await sync(shared.id, ann))).toEqual({ status: 403, json: { error: "only the owner can sync this account" } });
    expect(await body(await sync(a.id, root, {}))).toEqual({ status: 400, json: { error: "body must be {repo: owner/repo} for a github account" } });
    for (const repo of ["x acme/handbook", "acme/handbook/extra", "acme/ handbook"]) expect((await sync(a.id, root, { repo })).status).toBe(400);
    const other = await mk({ provider: "notion" });
    expect(await body(await sync(other.id))).toEqual({ status: 400, json: { error: "no connector for provider notion" } });
    const bare = await mk();
    await cur().s.vault.remove("t1", bare.id);
    expect(await body(await sync(bare.id))).toEqual({ status: 409, json: { error: "account needs re-authorisation" } });
    expect(cur().s.store.get("t1", bare.id)?.status).toBe("needs-auth");
    h.s.store.setStatus("t1", a.id, "needs-auth");
    expect(await body(await sync(a.id))).toEqual({ status: 409, json: { error: "account needs re-authorisation" } });
    expect(await body(await sync((await mk()).id, root, { repo: "acme/missing" }))).toMatchObject({
      status: 502,
      json: { error: "source sync failed" },
    });
    expect(h.gh.seen.every((s) => s.path !== "/repos/acme/handbook")).toBe(true);
  });
  it("501 body says sync is not configured", async () => {
    h = await bootSync({ sync: undefined as never });
    expect(await body(await sync((await mk()).id))).toEqual({ status: 501, json: { error: "sync is not configured" } });
  });
});

describe("sync clock and oauth refresh", () => {
  it("stamps edges at the request clock in milliseconds", async () => {
    h = await bootSync();
    const id = (await mk()).id;
    await sync(id);
    const ms = 1_800_000_000_000;
    expect(cur().graph.neighbors("t1", `github:${id}/README.md`, { kind: "can-read", dir: "in", asOf: ms - 1 })).toEqual([]);
    expect(cur().graph.neighbors("t1", `github:${id}/README.md`, { kind: "can-read", dir: "in", asOf: ms }).length).toBeGreaterThan(0);
  });
  it("refreshes an oauth token that is due, and leaves a token with no refresh grant alone", async () => {
    const idp = await startReplay({ id: "cid", secret: "csecret" }, { refresh: true });
    const github = oauthProvider("github", { clientId: "cid", clientSecret: "csecret", redirectURI: "http://app.test/cb", tokenURL: `${idp.url}/token` });
    h = await bootSync({ oauth: { github } });
    const due = new Date(1_800_000_000_000 - 1000);
    const a = await mk({ kind: "oauth" }, { accessToken: "old", refreshToken: "rt_x", expiresAt: due });
    await sync(a.id);
    expect(idp.tokenCalls).toBe(1);
    expect((await cur().s.vault.get("t1", a.id))?.token.accessToken).toBe("at_refreshed_1");
    await sync((await mk()).id);
    await sync((await mk({ kind: "oauth" }, { accessToken: "plain", expiresAt: due })).id);
    expect(idp.tokenCalls).toBe(1);
    await idp.close();
  });
});
