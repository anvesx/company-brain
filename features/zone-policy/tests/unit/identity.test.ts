import { describe, expect, it } from "vitest";
import { canSee, promote } from "../../src/index.js";
import { captureError, company, personal, team } from "../support/zones.js";

// M6: an empty identity string must never match anything.
describe("empty identities", () => {
  it("does not show an owner-less personal zone to an empty user", () => {
    expect(canSee(personal(""), { user: "", teams: [] })).toBe(false);
  });

  it("does not show a personal zone to an empty user", () => {
    expect(canSee(personal("ana"), { user: "", teams: [] })).toBe(false);
  });

  it("does not match an empty team name against an empty membership entry", () => {
    expect(canSee(team(""), { user: "ana", teams: [""] })).toBe(false);
  });

  it("rejects a team promotion by an empty user even if the proof says yes", () => {
    const yes = () => true;
    const error = captureError(() => promote(team("infra"), company, { by: "", at: 1 }, yes));
    expect(error).toMatchObject({ code: "NO_CONSENT" });
  });

  it("rejects an empty team even if the proof says yes", () => {
    const yes = () => true;
    const error = captureError(() => promote(team(""), company, { by: "bo", at: 1 }, yes));
    expect(error).toMatchObject({ code: "NOT_MEMBER" });
  });
});
