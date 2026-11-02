import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { derive, PromotionError, type Zone } from "../../src/index.js";
import { company, outcomeOf, personal, team } from "../support/zones.js";

const NAMES = ["ana", "bo", "チーム", "🙂", ""];
const zoneArb: fc.Arbitrary<Zone> = fc.oneof(fc.constantFrom(...NAMES).map(personal), fc.constantFrom(...NAMES).map(team), fc.constant(company));
const zonesArb = fc.array(zoneArb, { minLength: 1, maxLength: 6 });
const codeOf = (e: unknown) => (e instanceof PromotionError ? e.code : undefined);
const run = (zones: readonly Zone[]) => outcomeOf(() => derive([...zones]), codeOf);

describe("derive properties", () => {
  it("is commutative: the order of inputs does not change the result", () => {
    fc.assert(
      fc.property(zonesArb, (zones) => {
        expect(run(zones)).toEqual(run([...zones].reverse()));
      }),
    );
  });

  it("is idempotent: repeating every input does not change the result", () => {
    fc.assert(
      fc.property(zonesArb, (zones) => {
        expect(run([...zones, ...zones])).toEqual(run(zones));
      }),
    );
  });

  it("returns the input itself when given one zone twice", () => {
    fc.assert(
      fc.property(zoneArb, (zone) => {
        expect(derive([zone, zone])).toEqual(zone);
      }),
    );
  });
});
