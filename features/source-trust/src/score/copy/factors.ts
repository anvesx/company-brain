import type { Edge } from "../weight.js";

/** One node of the walk: claim index, next edge to look at, product so far. */
interface Frame {
  i: number;
  edges: Edge[];
  next: number;
  factor: number;
}

/**
 * Spec rule 4, data-fusion-dong-2015 Eq 13 and 14, source-dependence-dong-2009 Eq 11: a claim that
 * repeats its original's value counts (1 - share) times the original's own factor, so a chain
 * multiplies: 0.5 then 0.5 gives 0.25. `claims` hold one entry per source on one item.
 * Depth-first walk with an explicit stack, so a chain of any length cannot overflow the call stack.
 * A claim under visit holds 1, so a copy cycle stops at the claim that closes it.
 */
export const copyFactors = (claims: ReadonlyArray<{ source: number; group: number }>, edges: Map<number, Edge[]>): number[] => {
  const at = new Map(claims.map((c, i) => [c.source, i]));
  const memo: Array<number | undefined> = claims.map(() => undefined);
  const open = (i: number): Frame => {
    memo[i] = 1;
    return { i, edges: edges.get(claims[i]!.source) ?? [], next: 0, factor: 1 };
  };
  for (let root = 0; root < claims.length; root++) {
    if (memo[root] !== undefined) continue;
    const stack = [open(root)];
    while (stack.length > 0) {
      const top = stack[stack.length - 1]!;
      const edge = top.edges[top.next];
      if (edge === undefined) {
        memo[top.i] = top.factor;
        stack.pop();
        continue;
      }
      const j = at.get(edge.original);
      if (j === undefined || claims[j]!.group !== claims[top.i]!.group) top.next += 1;
      else if (memo[j] === undefined) stack.push(open(j));
      else {
        top.factor *= (1 - edge.share) * memo[j]!;
        top.next += 1;
      }
    }
  }
  return memo as number[];
};
