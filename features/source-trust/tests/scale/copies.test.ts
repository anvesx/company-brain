import { describe, expect, it } from "vitest";
import { edgesByCopier } from "../../src/input/newest.js";

/** One copier, `n` distinct originals listed in descending order so the sort has real work. */
const build = (n: number) => {
  const index = new Map<string, number>(Array.from({ length: n + 1 }, (_, i) => [`s${i}`, i]));
  const copies = Array.from({ length: n }, (_, i) => ({ copier: "s0", original: `s${n - i}`, share: 0.5 }));
  return { index, copies };
};

/** Fastest call in microseconds over at least 3 calls and 60 ms of CPU, so one noisy call cannot decide the ratio. */
const cpu = (n: number): number => {
  const { index, copies } = build(n);
  let best = Number.POSITIVE_INFINITY;
  let total = 0;
  for (let calls = 0; calls < 3 || total < 60_000; calls++) {
    const before = process.cpuUsage();
    edgesByCopier(copies, index);
    const used = process.cpuUsage(before);
    best = Math.min(best, used.user + used.system);
    total += used.user + used.system;
  }
  return best;
};

describe("scale copies", () => {
  it("rule 14: one copier with 40k originals costs under 3x one with 20k, so edges are not copied per push", () => {
    cpu(5_000); // Warm-up so JIT compilation is not charged to the first measured run.
    const small = cpu(20_000);
    const large = cpu(40_000);
    const ratio = large / small;
    console.log(`scale copies: 20k edges ${small} us cpu, 40k edges ${large} us cpu, ratio ${ratio.toFixed(2)}`);
    // Pushing is O(n log n) for the sort, ratio about 2. Rebuilding the array per edge is quadratic, ratio about 4.
    expect(ratio).toBeLessThan(3);
  }, 60_000);
});
