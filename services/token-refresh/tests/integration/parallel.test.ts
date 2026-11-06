import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { count, MINUTE } from "../../../../features/identity/tests/support/db.js";
import { LEASE_MS, sweep, takeLease } from "../../src/index.js";
import { tokensOf, type World, world } from "../helpers.js";

let w: World;
beforeEach(async () => {
  w = await world();
});
afterEach(async () => w.close());

const run = (lease: string, batch?: number) =>
  sweep({ adapter: w.adapter, refresh: w.env.identity.refreshAccount, now: w.env.clock.now, lease, ...(batch ? { batch } : {}) });
const needsAuth = () => count(w.env.db, "select count(*) as n from account where status = 'needs-auth'");

describe("sweeps across replicas (connector-accounts rules 6 and 7)", () => {
  it("rule 6: two sweeps at once refresh every row exactly once between them", async () => {
    const n = 300;
    await w.seed(n, 10 * MINUTE);
    const [a, b] = await Promise.all([run("replica-a", 50), run("replica-b", 50)]);
    expect(a.refreshed + b.refreshed).toBe(n);
    expect([...a.failed, ...b.failed]).toEqual([]);
    // A double refresh would spend a rotated refresh token twice; the replay counts every call it got.
    expect(w.replay.state.calls.refresh).toBe(n);
    expect(needsAuth()).toBe(0);
  });

  it("rule 6: rows held by a replica that died are picked up once its lease runs out", async () => {
    const ids = await w.seed(20, 10 * MINUTE);
    await takeLease(w.adapter, ids, "dead-replica", w.env.clock.now());
    expect(await run("b")).toEqual({ due: 20, refreshed: 0, failed: [], skipped: 20 });
    w.env.clock.advance(LEASE_MS + 1);
    expect(await run("b")).toEqual({ due: 20, refreshed: 20, failed: [], skipped: 0 });
    expect(w.replay.state.calls.refresh).toBe(20);
  });

  it("rule 6: provider down: every row fails, nothing is rewritten, and the next sweep tries again", async () => {
    const ids = await w.seed(5, 10 * MINUTE);
    const before = ids.map((id) => tokensOf(w.env, id));
    w.replay.state.mode = "server_error";
    const report = await run("a");
    expect([...report.failed].sort()).toEqual([...ids].sort());
    expect(ids.map((id) => tokensOf(w.env, id))).toEqual(before);
    expect(needsAuth()).toBe(0);
    w.replay.state.mode = "ok";
    expect((await run("a")).refreshed).toBe(5);
  });

  it("rule 6: refused grants mark rows needs-auth, and the next sweep no longer sees them", async () => {
    await w.seed(5, 10 * MINUTE);
    w.replay.state.mode = "invalid_grant";
    expect((await run("a")).failed).toHaveLength(5);
    expect(needsAuth()).toBe(5);
    expect(await run("a")).toEqual({ due: 0, refreshed: 0, failed: [], skipped: 0 });
  });
});
