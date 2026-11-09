import { describe, expect, it } from "vitest";
import { failing, outcome, refresherFor, row, seeded, status, useEnv } from "./kit.js";

useEnv();

describe("which token-endpoint answers mean the grant is gone (connector-accounts rule 4)", () => {
  const gone = "the provider refused the refresh token";
  const down = "the provider did not answer";
  it.each([
    ["400", { status: 400 }],
    ["401", { status: 401 }],
    ["invalid_grant with no status", { error: "invalid_grant" }],
    ["invalid_grant with a 200 status", { status: 200, error: "invalid_grant" }],
  ])("%s marks the row needs-auth and answers NEEDS_AUTH", async (_name, error) => {
    const id = await seeded();
    const { refresher, store } = await refresherFor([{ id: "replay", refreshAccessToken: failing(error) }]);
    expect(await outcome(refresher.refreshAccount(id, (await store.find(id)) ?? undefined))).toEqual({ code: "NEEDS_AUTH", message: gone });
    expect(status(id)).toBe("needs-auth");
  });

  it.each([
    ["500", { status: 500, error: "server_error" }],
    ["403", { status: 403 }],
    ["an empty error code", { status: 500, error: "" }],
    ["no status and no code", {}],
    ["a thrown undefined", undefined],
    ["a thrown null", null],
    ["a thrown string", "boom"],
  ])("%s is an outage: PROVIDER_DOWN, and the row is left exactly as it was", async (_name, error) => {
    const id = await seeded();
    const { refresher, store } = await refresherFor([{ id: "replay", refreshAccessToken: failing(error) }]);
    const before = row(id);
    expect(await outcome(refresher.refreshAccount(id, (await store.find(id)) ?? undefined))).toEqual({ code: "PROVIDER_DOWN", message: down });
    expect(row(id)).toEqual(before);
  });

  it("an answer with no access token is an outage, not a stored empty token", async () => {
    const id = await seeded();
    for (const answer of [{}, { accessToken: "" }]) {
      const { refresher, store } = await refresherFor([{ id: "replay", refreshAccessToken: async () => answer }]);
      const before = row(id);
      expect((await outcome(refresher.refreshAccount(id, (await store.find(id)) ?? undefined))).code).toBe("PROVIDER_DOWN");
      expect(row(id)).toEqual(before);
    }
  });
});
