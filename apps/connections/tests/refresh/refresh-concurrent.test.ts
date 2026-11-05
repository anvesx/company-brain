import { afterEach, describe, expect, it, vi } from "vitest";
import { oauthProvider } from "../../src/oauth/providers.js";
import { refreshAccount } from "../../src/oauth/state/refresh.js";
import { singleFlight } from "../../src/oauth/state/single-flight.js";
import { input, tempStore } from "../accounts/fixture.js";
import { startReplay } from "../oauth/replay-provider.js";

const cleanup: (() => void)[] = [];
afterEach(() => {
  for (const f of cleanup.splice(0)) f();
});
const stored = JSON.stringify({ accessToken: "old", refreshToken: "rt_x" });

async function setup(opts: Parameters<typeof startReplay>[1] = {}) {
  const replay = await startReplay({ id: "cid", secret: "csecret" }, opts);
  const t = tempStore();
  cleanup.push(replay.close, t.done);
  const provider = oauthProvider("github", { clientId: "cid", clientSecret: "csecret", redirectURI: "http://app.test/cb", tokenURL: `${replay.url}/token` });
  const add = () => t.store.create({ ...input, kind: "oauth", provider: provider.source, secret: stored });
  return { replay, store: t.store, provider, add };
}
const cred = (s: { store: ReturnType<typeof tempStore>["store"] }, id: string) => JSON.parse(s.store.credential("t1", id) as string);

describe("refreshAccount under concurrency", () => {
  it("makes one upstream call for N concurrent refreshes and persists the rotated token once", async () => {
    const s = await setup({ rotate: true });
    const a = s.add();
    const set = vi.spyOn(s.store, "setCredential");
    const out = await Promise.all(Array.from({ length: 8 }, () => refreshAccount(s.store, s.provider, "t1", a.id)));
    expect(out).toEqual(Array(8).fill("refreshed"));
    expect(s.replay.tokenCalls).toBe(1);
    expect(set).toHaveBeenCalledTimes(1);
    expect(cred(s, a.id)).toEqual({ accessToken: "at_refreshed_1", refreshToken: "rt_rotated_1" });
  });
  it("does not serialise different accounts", async () => {
    const s = await setup();
    const [a, b] = [s.add(), s.add()];
    await Promise.all([refreshAccount(s.store, s.provider, "t1", a.id), refreshAccount(s.store, s.provider, "t1", b.id)]);
    expect(s.replay.tokenCalls).toBe(2);
  });
  it("gives every waiter the failure and retries upstream on the next attempt", async () => {
    const s = await setup({ revoke: true });
    const a = s.add();
    const out = await Promise.all([1, 2, 3].map(() => refreshAccount(s.store, s.provider, "t1", a.id)));
    expect(out).toEqual(["needs-auth", "needs-auth", "needs-auth"]);
    expect(s.replay.tokenCalls).toBe(1);
    expect(await refreshAccount(s.store, s.provider, "t1", a.id)).toBe("needs-auth");
    expect(s.replay.tokenCalls).toBe(2);
  });
});

describe("singleFlight", () => {
  it("shares one run per key, propagates a rejection to all waiters and then forgets it", async () => {
    const flight = singleFlight<string>();
    let n = 0;
    const boom = async (): Promise<string> => {
      n++;
      await Promise.resolve();
      throw new Error("boom");
    };
    const all = await Promise.allSettled([flight("k", boom), flight("k", boom), flight("k", boom)]);
    expect(all.map((r) => r.status)).toEqual(["rejected", "rejected", "rejected"]);
    expect(n).toBe(1);
    expect(await flight("k", async () => "ok")).toBe("ok");
  });
});
