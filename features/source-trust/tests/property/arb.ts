import fc from "fast-check";
import type { Claim, Source, SourceClass, TrustInput } from "../../src/index.js";

const allClasses: SourceClass[] = ["signed", "record", "wiki", "ticket", "chat", "draft", "opinion", "news"];
/** Classes whose prior beats 1 / (1 + n) for every n, so every weight is positive at the prior. */
export const positiveClasses: SourceClass[] = ["signed", "record", "wiki", "ticket"];

/** Random small input: up to 6 sources, 5 items, 4 values, unique claim ids, valid timestamps. */
export const arbInput = (classes: SourceClass[] = allClasses): fc.Arbitrary<TrustInput> =>
  fc.array(fc.constantFrom(...classes), { minLength: 1, maxLength: 6 }).chain((picked) => {
    const sources: Source[] = picked.map((c, i) => ({ id: `s${i}`, class: c }));
    const claim = fc.record({
      source: fc.constantFrom(...sources.map((s) => s.id)),
      item: fc.constantFrom("i0", "i1", "i2", "i3", "i4"),
      value: fc.constantFrom("v0", "v1", "v2", "v3"),
      at: fc.nat({ max: 100 }),
    });
    return fc.array(claim, { maxLength: 30 }).map((raw) => ({
      sources,
      claims: raw.map((c, i): Claim => ({ id: `c${i}`, ...c })),
    }));
  });

/** Input plus a shuffled copy of the same sources and claims. */
export const arbShuffled = fc.tuple(arbInput(), fc.infiniteStream(fc.double({ min: 0, max: 1, noNaN: true }))).map(([input, stream]) => {
  const keys = [...stream.take(input.sources.length + input.claims.length)];
  const order = <T>(list: T[], offset: number) =>
    list
      .map((v, i) => [v, keys[offset + i]!] as const)
      .sort((a, b) => a[1] - b[1])
      .map(([v]) => v);
  return [input, { sources: order(input.sources, 0), claims: order(input.claims, input.sources.length) }] as const;
});

/** Recursively freeze so any write inside the package throws in strict mode. */
export const deepFreeze = <T>(value: T): T => {
  if (value && typeof value === "object") {
    for (const child of Object.values(value)) deepFreeze(child);
    Object.freeze(value);
  }
  return value;
};

export const runs = { numRuns: 200 };
