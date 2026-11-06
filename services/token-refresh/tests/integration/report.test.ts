import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { MINUTE } from "../../../../features/identity/tests/support/db.js";
import { BATCH, sweep } from "../../src/index.js";
import { leaseOf, leaseWrites, recording, type World, world } from "../helpers.js";

let w: World;
beforeEach(async () => {
  w = await world();
});
afterEach(async () => w.close());

/** The real identity refresh, with every account id it was asked for written down in order. */
const refresher = () => {
  const asked: string[] = [];
  // The row is passed on: it tells refreshAccount that the sweep already holds the lease. Without it, refreshAccount takes its own and gets LEASED.
  const refresh: Parameters<typeof sweep>[0]["refresh"] = (id, row) => {
    asked.push(id);
    return w.env.identity.refreshAccount(id, row);
  };
  return { asked, refresh };
};
const run = (lease: string, extra: Partial<Parameters<typeof sweep>[0]> = {}) =>
  sweep({ adapter: w.adapter, refresh: w.env.identity.refreshAccount, now: w.env.clock.now, lease, ...extra });

describe("sweep report (connector-accounts rule 5)", () => {
  it("rule 5: seven due rows at batch 3 are all refreshed once, and every lease is cleared", async () => {
    const ids = await w.seed(7, 10 * MINUTE);
    const r = refresher();
    expect(await run("a", { refresh: r.refresh, batch: 3 })).toEqual({ due: 7, refreshed: 7, failed: [], skipped: 0 });
    expect([...r.asked].sort()).toEqual([...ids].sort());
    expect(w.replay.state.calls.refresh).toBe(7);
    for (const id of ids) expect(leaseOf(w.env, id)).toMatchObject({ lease: null, status: "active" });
  });

  it("rule 5: refusals are listed by id, the rest still refresh, and leases are cleared either way", async () => {
    const ids = await w.seed(4, 10 * MINUTE);
    const refused = [String(ids[0]), String(ids[2])];
    for (const id of refused) {
      // A refresh token the provider never issued: the replay answers invalid_grant for it.
      await w.adapter.update({ model: "account", where: [{ field: "id", value: id }], update: { refreshToken: "rt_unknown" } });
    }
    const report = await run("a");
    expect([...report.failed].sort()).toEqual([...refused].sort());
    expect([report.due, report.refreshed, report.skipped]).toEqual([4, 2, 0]);
    for (const id of ids) expect(leaseOf(w.env, id).lease).toBeNull();
    for (const id of refused) expect(leaseOf(w.env, id).status).toBe("needs-auth");
  });

  it("rule 5: a row another replica holds is counted as skipped and its lease is left alone", async () => {
    const [held] = await w.seed(1, 10 * MINUTE);
    await w.seed(2, 10 * MINUTE);
    const until = w.env.clock.now() + 2 * MINUTE;
    await w.adapter.update({ model: "account", where: [{ field: "id", value: String(held) }], update: { refreshLease: "other", refreshLeaseUntil: until } });
    expect(await run("a")).toEqual({ due: 3, refreshed: 2, failed: [], skipped: 1 });
    expect(leaseOf(w.env, String(held))).toMatchObject({ lease: "other", until });
  });

  it("rule 5: rows with no expiry or outside the window are not counted at all", async () => {
    await w.seed(2, null);
    await w.seed(2, 45 * MINUTE);
    await w.seed(1, 5 * MINUTE);
    expect(await run("a")).toEqual({ due: 1, refreshed: 1, failed: [], skipped: 0 });
  });

  it("rule 7: 1001 due rows at the default batch of 500 take exactly three lease writes", async () => {
    expect(BATCH).toBe(500);
    await w.seed(1001, 10 * MINUTE);
    const rec = recording(w.adapter);
    const report = await run("a", { adapter: rec.adapter });
    expect(report).toEqual({ due: 1001, refreshed: 1001, failed: [], skipped: 0 });
    expect(leaseWrites(rec.writes)).toBe(3);
  });
});
