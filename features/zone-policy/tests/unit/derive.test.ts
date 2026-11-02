import { describe, expect, it } from "vitest";
import { canSee, derive, PromotionError } from "../../src/index.js";
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

  // H4: this used to assert derive([team, personal]) === personal, which let a
  // non-member of the team see team data. Personal is stricter only for a member.
  it("returns personal for personal + team only when the owner is proven in the team", () => {
    const member = (user: string, t: string) => user === "ana" && t === "infra";
    expect(derive([team("infra"), personal("ana")], member)).toEqual(personal("ana"));
  });

  it("throws NO_COMMON_ZONE for personal + team without proof or for a non-member", () => {
    const nobody = () => false;
    for (const call of [() => derive([team("finance"), personal("bob")]), () => derive([team("finance"), personal("bob")], nobody)]) {
      expect(captureError(call)).toMatchObject({ code: "NO_COMMON_ZONE" });
    }
  });

  it("never lets a non-finance user see data derived from finance + personal(bob)", () => {
    const isMember = (user: string, t: string) => user === "bob" && t === "finance";
    const zone = derive([team("finance"), personal("bob")], isMember);
    const outsider = { user: "eve", teams: ["eng"] };
    expect(canSee(zone, outsider)).toBe(false);
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
