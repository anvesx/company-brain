import { describe, expect, it } from "vitest";
import { canSee } from "../../src/index.js";
import { company, personal, team } from "../support/zones.js";

describe("canSee", () => {
  it("shows a personal zone to its owner only", () => {
    expect(canSee(personal("ana"), { user: "ana", teams: [] })).toBe(true);
    expect(canSee(personal("ana"), { user: "bo", teams: [] })).toBe(false);
  });

  it("hides a personal zone even from a user in every team", () => {
    expect(canSee(personal("ana"), { user: "bo", teams: ["infra", "ops"] })).toBe(false);
  });

  it("shows a team zone to members only", () => {
    expect(canSee(team("infra"), { user: "ana", teams: ["infra"] })).toBe(true);
    expect(canSee(team("infra"), { user: "ana", teams: ["ops"] })).toBe(false);
  });

  it("treats an empty team list as no membership", () => {
    expect(canSee(team("infra"), { user: "ana", teams: [] })).toBe(false);
  });

  it("matches unicode team names exactly", () => {
    expect(canSee(team("チーム"), { user: "ana", teams: ["チーム"] })).toBe(true);
    expect(canSee(team("チーム"), { user: "ana", teams: ["チ"] })).toBe(false);
  });

  it("shows the company zone to everyone", () => {
    expect(canSee(company, { user: "bo", teams: [] })).toBe(true);
  });
});
