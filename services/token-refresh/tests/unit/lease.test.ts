import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { MINUTE } from "../../../../features/identity/tests/support/db.js";
import { LEASE_MS, releaseLease, takeLease } from "../../src/index.js";
import { leaseOf, leaseWrites, recording, type World, world } from "../helpers.js";

let w: World;
beforeEach(async () => {
  w = await world();
});
afterEach(async () => w.close());

const sorted = (ids: string[]) => [...ids].sort();

describe("takeLease and releaseLease (connector-accounts rule 5: one replica per row)", () => {
  it("rule 5: the lease lasts 2 minutes and is written on every row it takes", async () => {
    expect(LEASE_MS).toBe(2 * MINUTE);
    const ids = await w.seed(3, 10 * MINUTE);
    const now = w.env.clock.now();
    expect(sorted(await takeLease(w.adapter, ids, "a", now))).toEqual(sorted(ids));
    for (const id of ids) expect(leaseOf(w.env, id)).toMatchObject({ lease: "a", until: now + LEASE_MS });
  });

  it("rule 5: a second replica gets nothing while the lease holds, even one millisecond before it ends", async () => {
    const ids = await w.seed(3, 10 * MINUTE);
    const now = w.env.clock.now();
    await takeLease(w.adapter, ids, "a", now);
    expect(await takeLease(w.adapter, ids, "b", now)).toEqual([]);
    expect(await takeLease(w.adapter, ids, "b", now + LEASE_MS)).toEqual([]);
    expect(sorted(await takeLease(w.adapter, ids, "b", now + LEASE_MS + 1))).toEqual(sorted(ids));
  });

  it("rule 5: release frees only rows held by that lease", async () => {
    const ids = await w.seed(2, 10 * MINUTE);
    const now = w.env.clock.now();
    await takeLease(w.adapter, ids, "a", now);
    await releaseLease(w.adapter, ids, "b");
    expect(await takeLease(w.adapter, ids, "b", now)).toEqual([]);
    await releaseLease(w.adapter, ids, "a");
    expect(leaseOf(w.env, String(ids[0])).lease).toBeNull();
    expect(sorted(await takeLease(w.adapter, ids, "b", now))).toEqual(sorted(ids));
  });

  it("rule 5: a row that stopped being due (refreshed by someone else, or needs-auth) is not taken", async () => {
    const [fresh] = await w.seed(1, 60 * MINUTE);
    const [refused] = await w.seed(1, MINUTE);
    const where = [{ field: "id", value: String(refused) }];
    await w.adapter.update({ model: "account", where, update: { status: "needs-auth" } });
    expect(await takeLease(w.adapter, [String(fresh), String(refused)], "a", w.env.clock.now())).toEqual([]);
  });

  it("rule 5: taking 500 rows is one conditional write, not one per row", async () => {
    const ids = await w.seed(500, 10 * MINUTE);
    const rec = recording(w.adapter);
    expect(await takeLease(rec.adapter, ids, "a", w.env.clock.now())).toHaveLength(500);
    expect(rec.writes).toHaveLength(1);
    expect(leaseWrites(rec.writes)).toBe(1);
  });
});
