import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { MINUTE } from "../../../../features/identity/tests/support/db.js";
import { selectDue, WINDOW_MS } from "../../src/index.js";
import { type World, world } from "../helpers.js";

let w: World;
beforeEach(async () => {
  w = await world();
});
afterEach(async () => w.close());

const due = (limit = 100, afterId?: string) => selectDue(w.adapter, w.env.clock.now(), limit, afterId);

describe("selectDue (connector-accounts rule 5: which rows the sweep looks at)", () => {
  it("rule 5: the window is 30 minutes", () => {
    expect(WINDOW_MS).toBe(30 * MINUTE);
  });

  it("rule 5: a token with 29:59 left is due, one with 30:01 left is not", async () => {
    const [inside] = await w.seed(1, 30 * MINUTE - 1000);
    const [outside] = await w.seed(1, 30 * MINUTE + 1000);
    const ids = await due();
    expect(ids).toContain(inside);
    expect(ids).not.toContain(outside);
  });

  it("rule 5: an already expired token is due", async () => {
    const [expired] = await w.seed(1, -5 * MINUTE);
    expect(await due()).toEqual([expired]);
  });

  it("rule 5: a row with no expiry is never due", async () => {
    await w.seed(3, null);
    expect(await due()).toEqual([]);
  });

  it("rule 5: a row marked needs-auth is never due, however close its expiry", async () => {
    const [gone, kept] = await w.seed(2, MINUTE);
    await w.adapter.update({ model: "account", where: [{ field: "id", value: String(gone) }], update: { status: "needs-auth" } });
    expect(await due()).toEqual([kept]);
  });

  it("rule 5: a leased row is still selected; the lease decides who refreshes it", async () => {
    const [held] = await w.seed(1, MINUTE);
    const update = { refreshLease: "other", refreshLeaseUntil: w.env.clock.now() + 2 * MINUTE };
    await w.adapter.update({ model: "account", where: [{ field: "id", value: String(held) }], update });
    expect(await due()).toEqual([held]);
  });

  it("rule 5: pages by id: ascending order, `limit` per page, `afterId` resumes with no repeats", async () => {
    const seeded = await w.seed(5, MINUTE);
    const first = await due(2);
    const second = await due(2, first.at(-1));
    const third = await due(2, second.at(-1));
    expect([first.length, second.length, third.length]).toEqual([2, 2, 1]);
    const all = [...first, ...second, ...third];
    expect(all).toEqual([...seeded].sort());
    expect(await due(2, third.at(-1))).toEqual([]);
  });
});
