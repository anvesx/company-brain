import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { RefreshError } from "../../../src/index.js";
import { MINUTE, one, toMs } from "../../support/db.js";
import { failure, type Person, signUp } from "../../support/http.js";
import { connectorConfig, linkReplay } from "../../support/replay/flow.js";
import { type Replay, startReplay } from "../../support/replay/server.js";
import { boot, type Env } from "../../support/server.js";

let [env, replay, ada] = [undefined as unknown as Env, undefined as unknown as Replay, undefined as unknown as Person];
beforeEach(async () => {
  replay = await startReplay();
  env = await boot(connectorConfig(replay));
  ada = await signUp(env, "Ada");
});
afterEach(async () => Promise.all([env.close(), replay.close()]));

/** Links with a token that expires `minutes` from now, then sets the provider up for the next refresh. */
const linkExpiring = async (minutes: number): Promise<string> => {
  replay.state.expiresIn = minutes * 60;
  const { id } = await linkReplay(env, ada);
  replay.state.expiresIn = 3600;
  return id;
};
const row = (id: string) => one(env.db, "select accessToken, refreshToken, accessTokenExpiresAt, status from account where id = ?", id);
const refused = (p: Promise<unknown>) =>
  p.then(
    () => new RefreshError("NEEDS_AUTH", "expected a rejection, got a token"),
    (e: unknown) => e as RefreshError,
  );

describe("access token on demand (connector-accounts rule 4)", () => {
  it("rule 4: 31 minutes left is used as is; 29 minutes left is refreshed first", async () => {
    const fresh = await linkExpiring(31);
    const first = await env.identity.port.accessToken(ada.userId, "replay", fresh);
    expect([first, replay.state.calls.refresh]).toEqual([await env.identity.port.accessToken(ada.userId, "replay", fresh), 0]);
    env.db.prepare("delete from account where id = ?").run(fresh);
    const due = await linkExpiring(29);
    const before = row(due);
    const next = await env.identity.port.accessToken(ada.userId, "replay", due);
    expect(replay.state.calls.refresh).toBe(1);
    expect(row(due)["accessToken"]).not.toBe(before["accessToken"]);
    expect(toMs(row(due)["accessTokenExpiresAt"])).toBeGreaterThan(env.clock.now() + 50 * MINUTE);
    expect(await env.identity.port.accessToken(ada.userId, "replay", due)).toBe(next);
  });

  it("rule 4: invalid_grant marks the row needs-auth and throws NEEDS_AUTH", async () => {
    const id = await linkExpiring(1);
    replay.state.mode = "invalid_grant";
    expect((await refused(env.identity.port.accessToken(ada.userId, "replay", id))).code).toBe("NEEDS_AUTH");
    expect(row(id)["status"]).toBe("needs-auth");
  });

  it("rule 4: a 500 throws PROVIDER_DOWN and leaves the row exactly as it was", async () => {
    const id = await linkExpiring(1);
    const before = row(id);
    replay.state.mode = "server_error";
    const error = await refused(env.identity.port.accessToken(ada.userId, "replay", id));
    expect([error instanceof RefreshError, error.code]).toEqual([true, "PROVIDER_DOWN"]);
    expect(row(id)).toEqual(before);
  });

  it("rule 4: a row a sweep holds the lease on is not refreshed twice; the caller gets LEASED", async () => {
    const id = await linkExpiring(1);
    const adapter = await env.identity.adapter();
    const update = { refreshLease: "other-replica", refreshLeaseUntil: env.clock.now() + 2 * MINUTE };
    await adapter.update({ model: "account", where: [{ field: "id", value: id }], update });
    expect((await refused(env.identity.port.accessToken(ada.userId, "replay", id))).code).toBe("LEASED");
    expect(replay.state.calls.refresh).toBe(0);
  });

  it("rule 4: another person's account id, or the wrong provider, is BAD_INPUT naming accountId", async () => {
    const id = await linkExpiring(1);
    const bob = await signUp(env, "Bob");
    for (const call of [env.identity.port.accessToken(bob.userId, "replay", id), env.identity.port.accessToken(ada.userId, "github", id)]) {
      const error = await failure(call);
      expect([error.code, error.field]).toEqual(["BAD_INPUT", "accountId"]);
    }
    expect(replay.state.calls.refresh).toBe(0);
  });
});
