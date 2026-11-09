import { describe, expect, it } from "vitest";
import { ctx, failing, outcome, type Provider, type Refresh, refresherFor, seeded, useEnv } from "./kit.js";

useEnv();

describe("a row that cannot be refreshed at all", () => {
  const again = "sign in to this connector again";
  it("no provider of that id, an empty provider list, a provider without refresh, or a row without a refresh token: NEEDS_AUTH, no call", async () => {
    const id = await seeded();
    let called = 0;
    const counting: Refresh = async () => {
      called += 1;
      return { accessToken: "x" };
    };
    const cases: [string, Provider[], boolean][] = [
      ["empty list", [], true],
      ["only another provider", [{ id: "other", refreshAccessToken: counting }], true],
      ["no refresh function", [{ id: "replay" }], true],
      ["no refresh token on the row", [{ id: "replay", refreshAccessToken: counting }], false],
    ];
    for (const [name, providers, hasToken] of cases) {
      const { refresher, store } = await refresherFor(providers);
      if (!hasToken) ctx.env.db.prepare("update account set refreshToken = NULL where id = ?").run(id);
      expect([name, await outcome(refresher.refreshAccount(id, (await store.find(id)) ?? undefined))]).toEqual([name, { code: "NEEDS_AUTH", message: again }]);
    }
    expect(called).toBe(0);
  });

  it("the provider is matched by id: the first provider in the list is not taken for ours", async () => {
    const id = await seeded();
    let asked = "";
    const providers: Provider[] = [
      {
        id: "other",
        refreshAccessToken: async () => {
          asked = "other";
          return { accessToken: "wrong" };
        },
      },
      { id: "replay", refreshAccessToken: failing({ status: 500 }) },
    ];
    const { refresher, store } = await refresherFor(providers);
    expect((await outcome(refresher.refreshAccount(id, (await store.find(id)) ?? undefined))).code).toBe("PROVIDER_DOWN");
    expect(asked).toBe("");
  });
});

describe("what a good refresh stores", () => {
  it("a rotated refresh token replaces the old one, and a missing one keeps it", async () => {
    const id = await seeded();
    const { refresher, store } = await refresherFor([{ id: "replay", refreshAccessToken: async () => ({ accessToken: "at-1", refreshToken: "rt-1" }) }]);
    const first = await store.find(id);
    await refresher.refreshAccount(id, first ?? undefined);
    const rotated = await store.find(id);
    expect([rotated?.accessToken, rotated?.refreshToken, rotated?.status]).toEqual(["at-1", "rt-1", "active"]);
    const { refresher: second } = await refresherFor([{ id: "replay", refreshAccessToken: async () => ({ accessToken: "at-2" }) }]);
    await second.refreshAccount(id, rotated ?? undefined);
    const kept = await store.find(id);
    expect([kept?.accessToken, kept?.refreshToken]).toEqual(["at-2", "rt-1"]);
  });
});
