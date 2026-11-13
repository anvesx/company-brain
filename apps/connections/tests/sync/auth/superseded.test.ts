import { afterEach, describe, expect, it } from "vitest";
import { root, seed } from "../../http/fixture.js";
import { bootSync } from "../fixture.js";

let h: Awaited<ReturnType<typeof bootSync>> | undefined;
afterEach(async () => h?.close());

describe("two syncs of one account at once", () => {
  it("the older one ends quietly: no failure in health, 409 for the caller", async () => {
    h = await bootSync({}, undefined, true);
    const a = await seed(h.s, {});
    const go = () => (h as NonNullable<typeof h>).s.call("POST", `/v1/accounts/${a.id}/sync`, root, { repo: "acme/handbook" });
    h.gate.hold();
    const first = go();
    await h.gate.reached();
    const second = go();
    h.gate.release();
    expect([(await first).status, (await second).status].sort()).toEqual([200, 409]);
    expect(h.s.store.health.read("t1", a.id).failures).toBe(0);
  });
});
