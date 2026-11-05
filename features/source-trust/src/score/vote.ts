import type { ItemModel } from "../input/prepare.js";
import { type Tally, voteWeight } from "./weight.js";

/** Scores C(v) and confidences P(v), one entry per value of the item, in the item's value order. */
export interface Vote {
  scores: number[];
  conf: number[];
}

/**
 * Spec rules 3 and 9, data-fusion-dong-2015 Eq 3 and 4: C(v) = sum of A'(S) * copy * decay, then
 * P(v) = 2^C(v) / sum 2^C(v'), with the largest C subtracted so 2^C never overflows.
 * A corrected item pins P to 1 for the settled value and 0 for the rest.
 */
export const voteItem = (item: ItemModel, accuracy: number[], tally: Tally = { visits: 0 }): Vote => {
  // Loops below: claims once, values five times (init, top, exps, sum, conf).
  tally.visits += item.claims.length + 5 * item.values.length;
  const scores = item.values.map(() => 0);
  for (const c of item.claims) scores[c.group]! += voteWeight(accuracy[c.source]!, item.n) * c.factor;
  const top = scores.reduce((a, b) => Math.max(a, b), Number.NEGATIVE_INFINITY);
  // 2 ** (C - top): the best value gives 2^0 = 1, so the sum is at least 1 and never zero.
  const exps = scores.map((s) => 2 ** (s - top));
  const sum = exps.reduce((a, b) => a + b, 0);
  const conf = item.corrected >= 0 ? exps.map((_, g) => (g === item.corrected ? 1 : 0)) : exps.map((e) => e / sum);
  return { scores, conf };
};
