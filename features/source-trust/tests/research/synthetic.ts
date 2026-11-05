import { uniformFloat64 } from "pure-rand/distribution/uniformFloat64";
import { uniformInt } from "pure-rand/distribution/uniformInt";
import { xoroshiro128plus } from "pure-rand/generator/xoroshiro128plus";
import type { Claim, CopyEdge, Source } from "../../src/index.js";

export interface Synthetic {
  sources: Source[];
  claims: Claim[];
  copies: CopyEdge[];
  truth: Map<string, string>;
}

const VALUES = ["a", "b", "c", "d"];
const SHARE = 0.8;
/** Each independent source states each item with this probability; full coverage saturates
 * majority vote at 500 of 500 and proves nothing (measured by the architect). */
export const COVERAGE = 0.15;

/**
 * Seeded world for the replication study (Dong 2009 setup, scaled down).
 * 20 independent sources, accuracy uniform in [0.3, 0.95]. 500 items, each with one true value
 * picked at random from a, b, c, d (so the lexicographic tie rule cannot favour the truth) and
 * 3 wrong ones. A source states the truth with probability = its accuracy, else a random wrong
 * value. 5 copiers: copier k repeats source k's claim verbatim with probability 0.8, wrong ones
 * included, and otherwise claims independently with its own drawn accuracy. Every claim is at 0.
 * Coverage 0.15: a source speaks on about 15% of items, so items get around 3 claims each.
 */
export const synthetic = (seed = 42, sourceCount = 20, items = 500, copiers = 5): Synthetic => {
  const rng = xoroshiro128plus(seed);
  const accuracy = (): number => 0.3 + 0.65 * uniformFloat64(rng);
  const independent = (item: number, acc: number, truth: string[]): string => {
    if (uniformFloat64(rng) < acc) return truth[item]!;
    const wrong = VALUES.filter((v) => v !== truth[item]);
    return wrong[uniformInt(rng, 0, wrong.length - 1)]!;
  };
  const accuracies = Array.from({ length: sourceCount + copiers }, accuracy);
  const truth = Array.from({ length: items }, () => VALUES[uniformInt(rng, 0, VALUES.length - 1)]!);
  const sources: Source[] = accuracies.map((_, i) => ({ id: `s${String(i).padStart(2, "0")}`, class: "wiki" }));
  const claims: Claim[] = [];
  const said: (string | undefined)[][] = sources.map(() => []);
  for (let s = 0; s < sources.length; s++) {
    for (let item = 0; item < items; item++) {
      const k = s - sourceCount;
      const copied = k >= 0 && uniformFloat64(rng) < SHARE;
      // A copier repeats whatever its original said, silence included; others speak at COVERAGE.
      const value = copied ? said[k]![item] : uniformFloat64(rng) < COVERAGE ? independent(item, accuracies[s]!, truth) : undefined;
      said[s]!.push(value);
      if (value !== undefined) claims.push({ id: `${sources[s]!.id}-${item}`, source: sources[s]!.id, item: `i${item}`, value, at: 0 });
    }
  }
  const copies = Array.from({ length: copiers }, (_, k) => ({ copier: sources[sourceCount + k]!.id, original: sources[k]!.id, share: SHARE }));
  return { sources, claims, copies, truth: new Map(truth.map((v, i) => [`i${i}`, v])) };
};

/** Correct items over all items, with the raw counts for printing. */
export const precision = (items: { item: string; value: string | null }[], truth: Map<string, string>) => {
  const correct = items.filter((r) => r.value === truth.get(r.item)).length;
  return { correct, total: truth.size, value: correct / truth.size };
};
