import { describe, expect, it } from "vitest";
import { code } from "../../support/helpers.js";
import { opts, star } from "./reads.js";

describe("reach limit", () => {
  it("returns exactly limit nodes, in order", () => {
    const ids = star(30, 30)
      .reach("t1", "r", opts(7))
      .map((x) => x.id);
    expect(ids).toEqual(["n0", "n1", "n2", "n3", "n4", "n5", "n6"]);
  });

  it("returns nothing for limit 0", () => {
    expect(star(5, 5).reach("t1", "r", opts(0))).toEqual([]);
  });

  it("rejects negative, fractional, NaN and infinite limits", () => {
    const s = star(2, 2);
    for (const limit of [-1, -1e9, 1.5, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(code(() => s.reach("t1", "r", opts(limit)))).toBe("BAD_INPUT");
    }
  });

  it("handles a huge limit without error", () => {
    expect(star(20, 20).reach("t1", "r", opts(Number.MAX_SAFE_INTEGER))).toHaveLength(20);
  });

  it("collapses duplicate kinds and does not count missing targets", () => {
    const r = star(10, 4).reach("t1", "r", { kinds: ["links-to", "links-to"], depth: 1, limit: 3 });
    expect(r.map((x) => x.id)).toEqual(["n0", "n1", "n2"]);
  });

  it("stops reading edges at the budget, so missing targets past it are never reached", () => {
    const s = star(500, 0);
    expect(s.reach("t1", "r", opts(1))).toEqual([]);
  });
});
