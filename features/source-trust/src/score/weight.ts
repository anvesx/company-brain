import type { SourceClass } from "../types.js";

/** Class priors, spec rule 1 (our proposal, overridable through options.priors). */
export const PRIORS: Record<SourceClass, number> = {
  signed: 0.95,
  record: 0.9,
  wiki: 0.75,
  ticket: 0.65,
  news: 0.55,
  chat: 0.5,
  draft: 0.4,
  opinion: 0.35,
};
const LOW = 0.01;
const HIGH = 0.99;
const DECAY_FLOOR = 0.1;

/**
 * Counts the elements every per-round loop visits (spec rule 14). RULE: any new loop that runs
 * once per round, in rounds.ts or a helper it calls, must add the elements it visits to `visits`.
 */
export interface Tally {
  visits: number;
}

/** A copier-to-original link, already resolved to source indexes. */
export interface Edge {
  original: number;
  share: number;
}

/** Spec rule 2: keep accuracy in [0.01, 0.99] so log2 stays finite. */
export const clampAccuracy = (accuracy: number): number => Math.min(HIGH, Math.max(LOW, accuracy));

/** Spec rule 2, data-fusion-dong-2015 Eq 3: A'(S) = log2(n A / (1 - A)); log2(5 * 0.97 / 0.03) = 7.34. */
export const voteWeight = (accuracy: number, n: number): number => {
  const a = clampAccuracy(accuracy);
  return Math.log2((n * a) / (1 - a));
};

/** Spec rule 2: n = max(1, distinct values - 1), the number of false values the paper assumes. */
export const falseValues = (distinct: number): number => Math.max(1, distinct - 1);

/** Spec rule 5: max(0.1, 0.5^(age / halfLife)); no half life means 1. Negative age counts as 0. */
export const decayFactor = (now: number, at: number, halfLifeMs: number | undefined): number =>
  halfLifeMs === undefined ? 1 : Math.max(DECAY_FLOOR, 0.5 ** (Math.max(0, now - at) / halfLifeMs));

export { copyFactors } from "./copy/factors.js";
