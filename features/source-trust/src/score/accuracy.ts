import { clampAccuracy, type Tally } from "./weight.js";

/** Spec rule 7, KBT Sec 5.3.1: a source learns only from minClaims claims or more. */
export const isLearned = (claims: number, minClaims: number): boolean => claims >= minClaims;

/**
 * Spec rule 7, data-fusion-dong-2015 Eq 1: A(S) = mean of P(v) over S's counted claims, clamped
 * to [0.01, 0.99]. `sums[s]` is the total P over S's claims; a source below minClaims keeps its prior.
 */
export const learnAccuracy = (sums: number[], counts: number[], priors: number[], minClaims: number, tally: Tally = { visits: 0 }): number[] => {
  tally.visits += priors.length;
  return priors.map((prior, s) => (isLearned(counts[s]!, minClaims) ? clampAccuracy(sums[s]! / counts[s]!) : prior));
};
