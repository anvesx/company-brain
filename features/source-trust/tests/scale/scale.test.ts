import { describe, expect, it } from "vitest";
import { type Claim, resolveClaims, type Source, type SourceClass } from "../../src/index.js";
import { prepare } from "../../src/input/prepare.js";
import { runRounds } from "../../src/score/rounds.js";

const CLASSES: SourceClass[] = ["signed", "record", "wiki", "ticket", "chat", "draft", "opinion", "news"];
const SOURCES = 1_000;
const PER_ITEM = 10;

// Deterministic arithmetic data, no randomness. Item k gets 10 claims j = 0..9 from the distinct
// sources (13k + 101j) mod 1000, each with one of 3 values picked by a hash of source, item and j.
// Sources disagree in a mixed pattern, so every round moves some accuracy and the loop does not
// settle: it runs to maxRounds.
const sources: Source[] = Array.from({ length: SOURCES }, (_, i) => ({ id: `s${i}`, class: CLASSES[i % CLASSES.length]! }));
const makeClaims = (items: number): Claim[] =>
  Array.from({ length: items * PER_ITEM }, (_, i) => {
    const item = i % items;
    const j = Math.floor(i / items);
    const source = (item * 13 + j * 101) % SOURCES;
    return { id: `c${i}`, source: `s${source}`, item: `i${item}`, value: `v${(((source * 7 + item * 3 + j) * 2654435761) >>> 7) % 3}`, at: i };
  });

/** Resolve `items` items (10 claims each) for 20 rounds; return CPU microseconds, not wall clock. */
const run = (items: number): { cpu: number; rounds: number; converged: boolean; resolved: number } => {
  const claims = makeClaims(items);
  const before = process.cpuUsage();
  const r = resolveClaims({ sources, claims }, { now: claims.length, minClaims: 5, maxRounds: 20, epsilon: 1e-15 });
  const used = process.cpuUsage(before);
  return { cpu: used.user + used.system, rounds: r.rounds, converged: r.converged, resolved: r.items.length };
};

describe("scale", () => {
  it("rule 14: every per-round loop visits each claim a fixed number of times", () => {
    const claims = makeClaims(2_000);
    const settings = { minClaims: 5, maxRounds: 20, epsilon: 1e-15 };
    const model = prepare({ sources, claims }, { now: claims.length });
    const run = runRounds(model, settings);
    const values = model.items.reduce((n, item) => n + item.values.length, 0);
    // Per-round visits, counted from the loops in rounds.ts, vote.ts and accuracy.ts (I items, N
    // claims, V distinct values over all items, S sources):
    //   items.map(voteItem) I, voteItem claim loop N + five value loops 5V (init, top, exps, sum, conf),
    //   sums init S, items.forEach I, accuracy-sum loop N, learnAccuracy S, convergence reduce S
    //   = 2 I + 2 N + 5 V + 3 S, so k = 2 per claim and c = 3 per source.
    // A new per-round loop must add its visits to the tally, or this equality will not see it.
    expect(run.rounds).toBe(20);
    expect(run.visits / run.rounds).toBe(2 * model.items.length + 2 * claims.length + 5 * values + 3 * SOURCES);
  });

  it("rule 14: cost is linear in claims, so doubling 50k to 100k claims costs under 3x the CPU time", () => {
    run(1_000); // Warm-up so JIT compilation is not charged to the first measured run.
    const small = run(5_000);
    const large = run(10_000);
    const ratio = large.cpu / small.cpu;
    console.log(`scale: 50k claims ${small.cpu} us cpu, 100k claims ${large.cpu} us cpu, ratio ${ratio.toFixed(2)}, ${large.rounds} rounds`);
    expect(large.resolved).toBe(10_000);
    // Rule 8: accuracies keep moving by more than 1e-15 for all 20 rounds, so the loop
    // never converges and runs exactly maxRounds. Both runs do the same work per claim.
    expect(small.rounds).toBe(20);
    expect(large.rounds).toBe(20);
    expect(large.converged).toBe(false);
    // O(claims + copies) per round means ratio 2. A bound of 3 is loose: n^1.585 gives 3, so it
    // catches about n^1.585 and worse (quadratic gives 4), not a mild n log n drift. It is the only
    // check on work outside the instrumented per-round loops; the visit count covers those loops.
    expect(ratio).toBeLessThan(3);
    // The spec's "under 2 s" for 100k claims, counted as CPU time so machine load cannot fail it.
    expect(large.cpu).toBeLessThan(2_000_000);
  });
});
