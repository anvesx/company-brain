import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { resolveConfig } from "../../../src/config.js";
import { createRefresher } from "../../../src/connectors/refresh.js";
import { MINUTE, one } from "../../support/db.js";
import { signUp } from "../../support/http.js";
import { connectorConfig, seedAccounts } from "../../support/replay/flow.js";
import { type Replay, startReplay } from "../../support/replay/server.js";
import { boot, type Env } from "../../support/server.js";

let [env, replay] = [undefined as unknown as Env, undefined as unknown as Replay];
beforeEach(async () => {
  replay = await startReplay();
  env = await boot(connectorConfig(replay));
});
afterEach(async () => Promise.all([env.close(), replay.close()]));
const status = (id: string) => String(one(env.db, "select status from account where id = ?", id)["status"]);
const lease = (id: string) => one(env.db, "select refreshLease, refreshLeaseUntil from account where id = ?", id);

describe("two refreshes of one due account (connector-accounts rule 4)", () => {
  it("both callers get a token, the provider is asked once, and the row stays active with its lease released", async () => {
    const ada = await signUp(env, "Ada");
    const [id = ""] = await seedAccounts(env, replay, ada.userId, 1, MINUTE);
    const ask = () => env.identity.port.accessToken(ada.userId, "replay", id);
    const [first, second] = await Promise.all([ask(), ask()]);
    expect(first).toBe(second);
    expect(first.startsWith("at_")).toBe(true);
    expect([replay.state.calls.refresh, status(id)]).toEqual([1, "active"]);
    expect(lease(id)).toMatchObject({ refreshLease: null, refreshLeaseUntil: 0 });
  });

  it("a refresh another process holds is not repeated: the caller gets LEASED and the provider is not asked", async () => {
    const ada = await signUp(env, "Ada");
    const [id = ""] = await seedAccounts(env, replay, ada.userId, 1, MINUTE);
    env.db.prepare("update account set refreshLease = 'sweep', refreshLeaseUntil = ? where id = ?").run(env.clock.now() + 2 * MINUTE, id);
    await expect(env.identity.port.accessToken(ada.userId, "replay", id)).rejects.toMatchObject({ code: "LEASED" });
    expect(replay.state.calls.refresh).toBe(0);
  });

  it("a refusal that comes after another refresher rotated the token does not leave the row needs-auth", async () => {
    const ada = await signUp(env, "Ada");
    const [id = ""] = await seedAccounts(env, replay, ada.userId, 1, MINUTE);
    // Two sweeps reading the same row: the provider rotates the pair for the first, and refuses the old one the second presents.
    await Promise.allSettled([env.identity.refreshAccount(id), env.identity.refreshAccount(id)]);
    expect(status(id)).toBe("active");
  });

  it("a row written outside the adapter with a NULL lease end counts as free: one provider call, then a token", async () => {
    const ada = await signUp(env, "Ada");
    const [id = ""] = await seedAccounts(env, replay, ada.userId, 1, MINUTE);
    env.db.prepare("update account set refreshLease = NULL, refreshLeaseUntil = NULL where id = ?").run(id);
    const token = await env.identity.port.accessToken(ada.userId, "replay", id);
    expect(token.startsWith("at_")).toBe(true);
    expect(replay.state.calls.refresh).toBe(1);
  });

  it("compare-and-set: a refresh that lands between our look and our needs-auth mark wins, the row is not marked", async () => {
    const ada = await signUp(env, "Ada");
    const [id = ""] = await seedAccounts(env, replay, ada.userId, 1, MINUTE);
    const real = await env.identity.adapter();
    // After the provider has refused, the next read of the row is followed by another process's good write (it moves updatedAt).
    const racing = {
      ...real,
      findOne: async (args: Parameters<typeof real.findOne>[0]) => {
        const row = await real.findOne(args);
        if (replay.state.calls.refresh > 0)
          env.db.prepare("update account set updatedAt = ?, status = 'active' where id = ?").run("2099-01-01T00:00:00.000Z", id);
        return row;
      },
    } as typeof real;
    const refresher = createRefresher(env.identity.auth, resolveConfig(env.config), async () => racing);
    replay.state.mode = "invalid_grant";
    await refresher.refreshAccount(id);
    expect(status(id)).toBe("active");
  });
});
