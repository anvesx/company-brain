import { describe, expect, it } from "vitest";
import { resolveClaims } from "../../../src/index.js";
import { expectBadInput, put, type Row, validCall } from "./cases.js";

type Call = Parameters<Row[1]>[0];
const option = (key: string, value: unknown) => (call: Call) => {
  call.options[key] = value;
};
const prior = (value: unknown) => (call: Call) => {
  call.options["priors"] = { chat: value };
};

// Rule 12, number rows. One row per rejected case.
const rows: Row[] = [
  ["claim at negative", put("claims", 0, "at", -1), "claims[0].at"],
  ["claim at fractional", put("claims", 0, "at", 1.5), "claims[0].at"],
  ["claim at NaN", put("claims", 0, "at", Number.NaN), "claims[0].at"],
  ["claim at Infinity", put("claims", 1, "at", Number.POSITIVE_INFINITY), "claims[1].at"],
  ["claim at a string", put("claims", 0, "at", "1"), "claims[0].at"],
  ["correction at negative", put("corrections", 0, "at", -5), "corrections[0].at"],
  ["now negative", option("now", -1), "options.now"],
  ["now fractional", option("now", 0.5), "options.now"],
  ["now missing", option("now", undefined), "options.now"],
  // Priors must sit inside the clamp range [0.01, 0.99] (rule 12), so 0.005 and 0.995 fail too.
  ["prior 0", prior(0), "options.priors.chat"],
  ["prior 1", prior(1), "options.priors.chat"],
  ["prior just below 0.01", prior(0.0099), "options.priors.chat"],
  ["prior below clamp", prior(0.005), "options.priors.chat"],
  ["prior above clamp", prior(0.995), "options.priors.chat"],
  ["prior negative", prior(-0.2), "options.priors.chat"],
  ["prior NaN", prior(Number.NaN), "options.priors.chat"],
  ["priors not an object", option("priors", 5), "options.priors"],
  ["minClaims 0", option("minClaims", 0), "options.minClaims"],
  ["minClaims fractional", option("minClaims", 1.5), "options.minClaims"],
  ["maxRounds 0", option("maxRounds", 0), "options.maxRounds"],
  ["maxRounds negative", option("maxRounds", -3), "options.maxRounds"],
  ["epsilon 0", option("epsilon", 0), "options.epsilon"],
  ["epsilon Infinity", option("epsilon", Number.POSITIVE_INFINITY), "options.epsilon"],
  ["halfLifeMs 0", option("halfLifeMs", 0), "options.halfLifeMs"],
  ["halfLifeMs NaN", option("halfLifeMs", Number.NaN), "options.halfLifeMs"],
];

describe("input/validate numbers", () => {
  it.each(rows)("rule 12: %s", (_label, breakIt, field) => {
    expectBadInput(breakIt, field);
  });

  it("rule 12: priors of exactly 0.01 and 0.99 are inside the range and accepted", () => {
    for (const value of [0.01, 0.99]) {
      const call = validCall();
      prior(value)(call);
      expect(() => resolveClaims(call.input as never, call.options as never)).not.toThrow();
    }
  });
});
