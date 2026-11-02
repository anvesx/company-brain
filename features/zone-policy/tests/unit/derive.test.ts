import { describe, expect, it } from "vitest";
import { derive, PromotionError } from "../../src/index.js";
import { captureError, company, personal, team } from "../support/zones.js";

describe("derive", () => {
  it("returns the single input unchanged", () => {
    expect(derive([team("infra")])).toEqual(team("infra"));
    expect(derive([company])).toEqual(company);
  });

  it("takes the strictest zone: personal over company", () => {
    expect(derive([company, personal("ana")])).toEqual(personal("ana"));
  });

  it("takes the strictest zone: team over company", () => {
    expect(derive([team("infra"), company])).toEqual(team("infra"));
  });

  it("takes the strictest zone: personal over team", () => {
    expect(derive([team("infra"), personal("ana")])).toEqual(personal("ana"));
  });

  it("accepts the same personal owner twice", () => {
    expect(derive([personal("ana"), personal("ana")])).toEqual(personal("ana"));
  });

  it("accepts the same team twice", () => {
    expect(derive([team("infra"), team("infra"), company])).toEqual(team("infra"));
  });

  it("throws RangeError on an empty list", () => {
    expect(() => derive([])).toThrow(RangeError);
  });

  it.each([
    ["two personal owners", [personal("ana"), personal("bo")]],
    ["two personal owners with company", [company, personal("ana"), personal("bo")]],
    ["two teams", [team("infra"), team("ops")]],
    ["two teams with company", [team("infra"), company, team("ops")]],
    ["two teams with a personal zone", [personal("ana"), team("infra"), team("ops")]],
  ])("throws NO_COMMON_ZONE for %s", (_name, inputs) => {
    const error = captureError(() => derive(inputs));
    expect(error).toBeInstanceOf(PromotionError);
    expect(error).toMatchObject({ code: "NO_COMMON_ZONE" });
  });

  it("handles unicode owner names", () => {
    expect(derive([company, personal("太郎"), personal("太郎")])).toEqual(personal("太郎"));
  });
});
