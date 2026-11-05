import { copyFactors, decayFactor, type Edge, falseValues, PRIORS } from "../score/weight.js";
import type { Claim, Correction, TrustInput, TrustOptions } from "../types.js";
import { cmp, edgesByCopier, newestClaims, newestCorrections } from "./newest.js";

/** One counted claim: source index, value index within its item, copy x decay factor, time. */
export interface ModelClaim {
  source: number;
  group: number;
  factor: number;
  at: number;
}
/** One item: sorted distinct values, n false values, claims sorted by source, and the settled value index (or -1). */
export interface ItemModel {
  item: string;
  values: string[];
  n: number;
  claims: ModelClaim[];
  corrected: number;
  correctedAt: number;
}
/** The validated, normalised, sorted input every round reads. Sources and items are in id order. */
export interface Model {
  sourceIds: string[];
  priors: number[];
  counts: number[];
  items: ItemModel[];
}

/** Spec rules 2, 4, 5, 13, 17: one item's values (NFC), n, and per-claim copy x decay factor. */
const buildItem = (item: string, row: Map<number, Claim>, fix: Correction | undefined, edges: Map<number, Edge[]>, options: TrustOptions): ItemModel => {
  const entries = [...row.entries()].sort((a, b) => a[0] - b[0]);
  const texts = entries.map(([, c]) => c.value.normalize("NFC"));
  const values = [...new Set(fix === undefined ? texts : [...texts, fix.value])].sort(cmp);
  const group = new Map(values.map((v, i) => [v, i]));
  const placed = entries.map(([source], i) => ({ source, group: group.get(texts[i]!)! }));
  const copy = copyFactors(placed, edges);
  const claims = placed.map((p, i) => ({ ...p, at: entries[i]![1].at, factor: copy[i]! * decayFactor(options.now, entries[i]![1].at, options.halfLifeMs) }));
  return { item, values, n: falseValues(values.length), claims, corrected: fix === undefined ? -1 : group.get(fix.value)!, correctedAt: fix?.at ?? 0 };
};

/** Normalise a validated call into the sorted Model: dedupe (rule 16), NFC (13), sort ids (10). */
export const prepare = (input: TrustInput, options: TrustOptions): Model => {
  const sorted = [...input.sources].sort((a, b) => cmp(a.id, b.id));
  const sourceIndex = new Map(sorted.map((s, i) => [s.id, i]));
  const byItem = newestClaims(input.claims, sourceIndex);
  const fixes = newestCorrections(input.corrections ?? []);
  const edges = edgesByCopier(input.copies ?? [], sourceIndex);
  const items = [...byItem.keys()].sort(cmp).map((id) => buildItem(id, byItem.get(id)!, fixes.get(id), edges, options));
  const counts = sorted.map(() => 0);
  for (const item of items) for (const c of item.claims) counts[c.source]! += 1;
  return { sourceIds: sorted.map((s) => s.id), priors: sorted.map((s) => options.priors?.[s.class] ?? PRIORS[s.class]), counts, items };
};
