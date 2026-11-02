import { describe, expect, it } from "vitest";
import { edge } from "../../support/helpers.js";
import { countReads, opts, star } from "./reads.js";

describe("reach cost", () => {
  it("looks up many targets with one edge read and one node read", () => {
    const s = star(300, 300);
    let got = 0;
    const n = countReads(() => {
      got = s.reach("t1", "r", opts(1000)).length;
    });
    expect(got).toBe(300);
    expect(n).toBe(2);
  });

  it("costs one edge read and one node read per level, not per node", () => {
    const s = star(50, 50);
    for (let i = 0; i < 50; i++) s.addEdge(edge(`n${i}`, `n${(i + 1) % 50}`), 1);
    const n = countReads(() => {
      s.reach("t1", "r", opts(1000, 3));
    });
    expect(n).toBeLessThanOrEqual(6);
  });

  it("bounds reads when edges point at missing nodes", () => {
    const s = star(5000, 0);
    const n = countReads(() => {
      expect(s.reach("t1", "r", opts(10))).toEqual([]);
    });
    expect(n).toBeLessThanOrEqual(4);
  });

  it("is not defeated by more targets than one SQL batch holds", () => {
    const s = star(1200, 1200);
    const n = countReads(() => {
      expect(s.reach("t1", "r", opts(2000))).toHaveLength(1200);
    });
    expect(n).toBe(4);
  });
});
