import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { oauthProvider } from "../../src/oauth/providers.js";
import { ann, pat, root } from "../http/fixture.js";
import { startReplay } from "../oauth/replay-provider.js";
import { bootSync } from "./fixture.js";

let h: Awaited<ReturnType<typeof bootSync>> | undefined;
afterEach(async () => {
  await h?.close();
  h = undefined;
});
const cur = () => h as NonNullable<typeof h>;
const mk = (extra: object = {}) =>
  cur().s.store.create({
    tenant: "t1",
    owner: "root",
    provider: "github",
    label: "x",
    kind: "pat",
    access: "private",
    dataZone: "company",
    secret: "ghp_secret",
    ...extra,
  } as never);
const sync = (id: string, who = root, b: unknown = { repo: "acme/handbook" }) => cur().s.call("POST", `/v1/accounts/${id}/sync`, who, b);
const body = async (r: Response) => ({ status: r.status, json: await r.json() });

describe("sync error bodies", () => {
  it("says what is wrong in each refusal", async () => {
    h = await bootSync();
    const a = mk();
    expect(await body(await sync("nope"))).toEqual({ status: 404, json: { error: "not found" } });
    const shared = mk({ access: "company" });
    expect(await body(await sync(shared.id, ann))).toEqual({ status: 403, json: { error: "only the owner can sync this account" } });
    expect(await body(await sync(a.id, root, {}))).toEqual({ status: 400, json: { error: "body must be {repo: owner/repo} for a github account" } });
    for (const repo of ["x acme/handbook", "acme/handbook/extra", "acme/ handbook"]) expect((await sync(a.id, root, { repo })).status).toBe(400);
    const other = mk({ provider: "notion" });
    expect(await body(await sync(other.id))).toEqual({ status: 400, json: { error: "no connector for provider notion" } });
    const bad = mk({ kind: "oauth", secret: "not json" });
    expect(await body(await sync(bad.id))).toEqual({ status: 409, json: { error: "account has no usable credential" } });
    h.s.store.setStatus("t1", a.id, "needs-auth");
    expect(await body(await sync(a.id))).toEqual({ status: 409, json: { error: "account needs re-authorisation" } });
    expect(await body(await sync(mk({ provider: "github" }).id, root, { repo: "acme/missing" }))).toMatchObject({
      status: 502,
      json: { error: "source sync failed" },
    });
    expect(h.gh.seen.every((s) => s.path !== "/repos/acme/handbook")).toBe(true);
  });
  it("501 body says sync is not configured", async () => {
    h = await bootSync({ sync: undefined as never });
    expect(await body(await sync(mk().id))).toEqual({ status: 501, json: { error: "sync is not configured" } });
  });
});

describe("sync clock and oauth refresh", () => {
  it("stamps edges at the request clock in milliseconds", async () => {
    h = await bootSync();
    const id = mk().id;
    await sync(id);
    const ms = 1_800_000_000_000;
    expect(cur().graph.neighbors("t1", `github:${id}/README.md`, { kind: "can-read", dir: "in", asOf: ms - 1 })).toEqual([]);
    expect(cur().graph.neighbors("t1", `github:${id}/README.md`, { kind: "can-read", dir: "in", asOf: ms }).length).toBeGreaterThan(0);
  });
  it("refreshes only oauth accounts that have a refresh token, and rewrites the token file after", async () => {
    const idp = await startReplay({ id: "cid", secret: "csecret" }, { refresh: true });
    const github = oauthProvider("github", { clientId: "cid", clientSecret: "csecret", redirectURI: "http://app.test/cb", tokenURL: `${idp.url}/token` });
    const file = join((await import("node:os")).tmpdir(), `tok-sync-${process.pid}.json`);
    h = await bootSync({ oauth: { github }, tokensFile: file });
    await sync(mk({ kind: "oauth", secret: JSON.stringify({ accessToken: "old", refreshToken: "rt_x" }) }).id);
    expect(idp.tokenCalls).toBe(1);
    expect(readFileSync(file, "utf8")).toContain("at_refreshed_1");
    await sync(mk(pat).id);
    await sync(mk({ kind: "oauth", secret: JSON.stringify({ accessToken: "plain" }) }).id);
    expect(idp.tokenCalls).toBe(1);
    await idp.close();
  });
});
