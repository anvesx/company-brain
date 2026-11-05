import { cmp } from "../input/newest.js";
import type { ItemModel } from "../input/prepare.js";
import type { Vote } from "../score/vote.js";
import type { Resolution, ValueGroup } from "../types.js";

/** Spec rule 6: top score wins; within epsilon the newest claim wins; equal times give the smaller value and tie true. */
const pick = (groups: ValueGroup[], epsilon: number): { winner: ValueGroup; tie: boolean } => {
  const [top, next] = groups as [ValueGroup, ValueGroup | undefined];
  if (next === undefined || top.score - next.score >= epsilon) return { winner: top, tie: false };
  if (top.newestAt > next.newestAt) return { winner: top, tie: false };
  if (next.newestAt > top.newestAt) return { winner: next, tie: false };
  return { winner: cmp(top.value, next.value) <= 0 ? top : next, tie: true };
};

/**
 * Spec rules 6, 9 and 17: one ValueGroup per value sorted by score then value, plus the verdict.
 * A settled item reports the corrected value with tie false; an unclaimed one has sources [].
 */
export const buildResolution = (item: ItemModel, vote: Vote, sourceIds: string[], epsilon: number): Resolution => {
  const groups: ValueGroup[] = item.values.map((value, g) => ({ value, score: vote.scores[g]!, confidence: vote.conf[g]!, sources: [], newestAt: 0 }));
  for (const c of item.claims) {
    const group = groups[c.group]!;
    group.sources.push(sourceIds[c.source]!);
    group.newestAt = Math.max(group.newestAt, c.at);
  }
  for (const group of groups) if (group.sources.length === 0) group.newestAt = item.correctedAt;
  const settled = item.corrected >= 0 ? groups[item.corrected] : undefined;
  groups.sort((a, b) => b.score - a.score || cmp(a.value, b.value));
  const { winner, tie } = settled === undefined ? pick(groups, epsilon) : { winner: settled, tie: false };
  return { item: item.item, value: winner.value, confidence: winner.confidence, groups, tie, corrected: settled !== undefined };
};
