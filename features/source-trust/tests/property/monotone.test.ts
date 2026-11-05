import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { resolveClaims, type TrustInput } from "../../src/index.js";
import { arbInput, positiveClasses, runs } from "./arb.js";

// One round at the priors and only classes above 1 / (1 + n), so every weight is positive.
// With a negative weight (rule 2) or accuracy feedback across rounds the statements can fail,
// which is why the property is scoped this way.
const opts = { now: 1000, maxRounds: 1 };
const conf = (input: TrustInput, item: string, value: string) =>
  resolveClaims(input, opts)
    .items.find((i) => i.item === item)!
    .groups.find((g) => g.value === value)?.confidence ?? 0;

describe("properties: monotonicity", () => {
  it("rule 4: adding a copy edge never raises the copied value's confidence", () => {
    fc.assert(
      fc.property(arbInput(positiveClasses), fc.double({ min: 0, max: 1, noNaN: true }), (input, share) => {
        fc.pre(input.sources.length >= 2);
        const [original, copier] = [input.sources[0]!.id, input.sources[1]!.id];
        const edged = { ...input, copies: [{ copier, original, share }] };
        for (const c of input.claims.filter((c) => c.source === copier)) {
          const same = input.claims.some((o) => o.source === original && o.item === c.item && o.value === c.value);
          if (same) expect(conf(edged, c.item, c.value)).toBeLessThanOrEqual(conf(input, c.item, c.value) + 1e-12);
        }
      }),
      runs,
    );
  });

  it("rule 3: removing a claim of the winner's sources never raises its confidence", () => {
    fc.assert(
      fc.property(arbInput(positiveClasses), (input) => {
        for (const item of resolveClaims(input, opts).items) {
          const winner = item.groups.find((g) => g.value === item.value)!;
          if (winner.sources.length < 2) continue;
          const drop = input.claims.find((c) => c.item === item.item && c.value === item.value && c.source === winner.sources[0]);
          const fewer = { ...input, claims: input.claims.filter((c) => c !== drop) };
          expect(conf(fewer, item.item, item.value!)).toBeLessThanOrEqual(item.confidence + 1e-12);
        }
      }),
      runs,
    );
  });
});
