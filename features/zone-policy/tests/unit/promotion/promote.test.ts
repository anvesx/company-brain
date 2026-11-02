import { describe, expect, it } from "vitest";
import { PromotionError, promote } from "../../../src/index.js";
import { captureError, company, personal, team } from "../../support/zones.js";

const ana = { by: "ana", at: 1 };

describe("promote", () => {
  it("promotes personal to team with the owner's consent", () => {
    expect(promote(personal("ana"), team("infra"), ana)).toEqual(team("infra"));
  });

  it("promotes personal straight to company with the owner's consent", () => {
    expect(promote(personal("ana"), company, ana)).toEqual(company);
  });

  it("promotes team to company with any non-empty consent", () => {
    expect(promote(team("infra"), company, { by: "bo", at: 2 })).toEqual(company);
  });

  it("does not validate the consent timestamp", () => {
    expect(promote(personal("ana"), company, { by: "ana", at: Number.NaN })).toEqual(company);
  });

  it("throws NO_CONSENT when consent is missing", () => {
    const error = captureError(() => promote(personal("ana"), team("infra"), undefined));
    expect(error).toBeInstanceOf(PromotionError);
    expect(error).toMatchObject({ code: "NO_CONSENT" });
  });

  it("throws NO_CONSENT when consent has an empty by", () => {
    const error = captureError(() => promote(team("infra"), company, { by: "", at: 1 }));
    expect(error).toMatchObject({ code: "NO_CONSENT" });
  });

  it("throws NOT_OWNER when a personal zone is consented by someone else", () => {
    const error = captureError(() => promote(personal("ana"), team("infra"), { by: "bo", at: 1 }));
    expect(error).toMatchObject({ code: "NOT_OWNER" });
  });

  it.each([
    ["team to personal", team("infra"), personal("ana")],
    ["company to team", company, team("infra")],
    ["company to personal", company, personal("ana")],
    ["personal to personal", personal("ana"), personal("bo")],
    ["team to team", team("infra"), team("ops")],
    ["company to company", company, company],
    ["team to same team", team("infra"), team("infra")],
  ])("throws NOT_OUTWARD for %s", (_name, from, to) => {
    const error = captureError(() => promote(from, to, ana));
    expect(error).toBeInstanceOf(PromotionError);
    expect(error).toMatchObject({ code: "NOT_OUTWARD" });
  });
});
