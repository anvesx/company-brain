import { afterEach, describe, expect, it } from "vitest";
import { oauthProvider } from "../../src/oauth/providers.js";
import { root } from "../http/fixture.js";
import { startReplay } from "../oauth/replay-provider.js";
import { bootSync } from "./fixture.js";

const closers: (() => unknown)[] = [];
afterEach(async () => {
  for (const c of closers.splice(0)) await c();
});

async function setup(opts: { revoke?: boolean }) {
  const idp = await startReplay({ id: "cid", secret: "csecret" }, { refresh: true, ...opts });
  const github = oauthProvider("github", { clientId: "cid", clientSecret: "csecret", redirectURI: "http://app.test/cb", tokenURL: `${idp.url}/token` });
  const h = await bootSync({ oauth: { github } });
  closers.push(h.close, idp.close);
  const a = h.s.store.create({
    tenant: "t1",
    owner: "root",
    provider: "github",
    label: "o",
    kind: "oauth",
    access: "private",
    dataZone: "company",
    secret: JSON.stringify({ accessToken: "stale", refreshToken: "rt_x" }),
  });
  const sync = () => h.s.call("POST", `/v1/accounts/${a.id}/sync`, root, { repo: "acme/handbook" });
  return { h, idp, a, sync };
}

describe("sync of an oauth account", () => {
  it("refreshes first, then lists with the new access token", async () => {
    const { h, idp, a, sync } = await setup({});
    expect((await sync()).status).toBe(200);
    expect(idp.tokenCalls).toBe(1);
    expect(h.gh.seen.every((s) => s.authorization === "token at_refreshed_1")).toBe(true);
    expect(JSON.parse(h.s.store.credential(a.id) as string).accessToken).toBe("at_refreshed_1");
  });
  it("flips to needs-auth and answers 409 when the refresh is refused", async () => {
    const { h, a, sync } = await setup({ revoke: true });
    const r = await sync();
    expect(r.status).toBe(409);
    expect(h.s.store.get(a.id)?.status).toBe("needs-auth");
    expect(h.gh.seen).toEqual([]);
  });
});
