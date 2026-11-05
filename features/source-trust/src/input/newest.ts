import type { Edge } from "../score/weight.js";
import type { Claim, CopyEdge, Correction } from "../types.js";

/** Code-unit string order; the one order used for ids and values so output never depends on input order. */
export const cmp = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);

/** Spec rule 16: keep the newest claim per item and source; equal times fall back to the larger claim id. */
export const newestClaims = (claims: Claim[], sourceIndex: Map<string, number>): Map<string, Map<number, Claim>> => {
  const byItem = new Map<string, Map<number, Claim>>();
  for (const c of claims) {
    const row = byItem.get(c.item) ?? new Map<number, Claim>();
    const s = sourceIndex.get(c.source)!;
    const old = row.get(s);
    if (old === undefined || c.at > old.at || (c.at === old.at && c.id > old.id)) row.set(s, c);
    byItem.set(c.item, row);
  }
  return byItem;
};

/** Spec rules 9 and 17: newest correction per item wins; equal times pick the smaller NFC value. */
export const newestCorrections = (corrections: Correction[]): Map<string, Correction> => {
  const best = new Map<string, Correction>();
  for (const c of corrections) {
    const value = c.value.normalize("NFC");
    const old = best.get(c.item);
    if (old === undefined || c.at > old.at || (c.at === old.at && cmp(value, old.value) < 0)) best.set(c.item, { item: c.item, value, at: c.at });
  }
  return best;
};

/** Copy edges by copier index, each list sorted by original so the factor product has one order. */
export const edgesByCopier = (copies: CopyEdge[], sourceIndex: Map<string, number>): Map<number, Edge[]> => {
  const edges = new Map<number, Edge[]>();
  for (const e of copies) {
    const copier = sourceIndex.get(e.copier)!;
    const row = edges.get(copier) ?? [];
    row.push({ original: sourceIndex.get(e.original)!, share: e.share });
    edges.set(copier, row);
  }
  for (const row of edges.values()) row.sort((a, b) => a.original - b.original);
  return edges;
};
