import { afterEach, describe, expect, it } from "vitest";
import { oauthProvider } from "../../src/oauth/providers.js";
import { refreshAccount } from "../../src/oauth/state/refresh.js";
import { input, tempStore } from "../accounts/fixture.js";
import { startReplay } from "../oauth/replay-provider.js";

const client = { id: "cid", secret: "csecret" };
const cleanup: (() => void)[] = [];
afterEach(() => {
  for (const f of cleanup.splice(0)) f();
});

async function setup(opts: Parameters<typeof startReplay>[1] = {}, name: "github" | "google" = "github") {
  const replay = await startReplay(client, opts);
  const t = tempStore();
  cleanup.push(replay.close, t.done);
  const provider = oauthProvider(name, { clientId: "cid", clientSecret: "csecret", redirectURI: "http://app.test/cb", tokenURL: `${replay.url}/token` });
  const add = (secret: string, kind: "oauth" | "pat" = "oauth") => t.store.create({ ...input, kind, provider: provider.source, secret });
  return { replay, store: t.store, provider, add };
}
const cred = (s: { store: ReturnType<typeof tempStore>["store"] }, id: string) => JSON.parse(s.store.credential(id) as string);
const stored = JSON.stringify({ accessToken: "old", refreshToken: "rt_x" });

describe("refreshAccount", () => {
  it.each(["github", "google"] as const)("swaps in a new access token for %s and keeps the refresh token", async (name) => {
    const s = await setup({}, name);
    const a = s.add(stored);
    expect(await refreshAccount(s.store, s.provider, a.id)).toBe("refreshed");
    expect(cred(s, a.id)).toEqual({ accessToken: "at_refreshed_1", refreshToken: "rt_x" });
    expect(s.store.get(a.id)?.status).toBe("active");
    expect(s.replay.tokenCalls).toBe(1);
  });
  it("stores a rotated refresh token", async () => {
    const s = await setup({ rotate: true });
    const a = s.add(stored);
    await refreshAccount(s.store, s.provider, a.id);
    expect(cred(s, a.id)).toEqual({ accessToken: "at_refreshed_1", refreshToken: "rt_rotated_1" });
  });
  it("marks needs-auth when the provider refuses, and keeps the credential", async () => {
    const s = await setup({ revoke: true });
    const a = s.add(stored);
    expect(await refreshAccount(s.store, s.provider, a.id)).toBe("needs-auth");
    expect(s.store.get(a.id)?.status).toBe("needs-auth");
    expect(cred(s, a.id)).toEqual({ accessToken: "old", refreshToken: "rt_x" });
  });
  it("marks needs-auth when the provider is unreachable", async () => {
    const s = await setup();
    const a = s.add(stored);
    s.replay.close();
    expect(await refreshAccount(s.store, s.provider, a.id)).toBe("needs-auth");
    expect(s.store.get(a.id)?.status).toBe("needs-auth");
  });
  it("leaves accounts without a refresh token alone and never calls the provider", async () => {
    const s = await setup();
    const noRefresh = s.add(JSON.stringify({ accessToken: "old" }));
    const pat = s.add("ghp_x", "pat");
    const junk = s.add("not json");
    for (const id of [noRefresh.id, pat.id, junk.id, "nope"]) expect(await refreshAccount(s.store, s.provider, id)).toBe("unsupported");
    expect([noRefresh, pat, junk].map((a) => s.store.get(a.id)?.status)).toEqual(["active", "active", "active"]);
    expect(s.replay.tokenCalls).toBe(0);
  });
  it("refuses an account of another provider", async () => {
    const s = await setup();
    const a = s.store.create({ ...input, kind: "oauth", provider: "drive", secret: stored });
    expect(await refreshAccount(s.store, s.provider, a.id)).toBe("unsupported");
    expect(s.replay.tokenCalls).toBe(0);
  });
});
