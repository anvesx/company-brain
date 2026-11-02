import { describe, expect, it } from "vitest";
import { checkZones } from "../../../src/accounts/rules/widen.js";

const base = { credential: "pat", access: "private", dataZone: "private", ownerIsAdmin: false } as const;

describe("checkZones", () => {
  it("allows private and personal for a pat owner who is not admin", () => {
    expect(checkZones(base)).toEqual({ ok: true });
    expect(checkZones({ ...base, access: "personal", dataZone: "personal" })).toEqual({ ok: true });
  });
  it.each(["pat", "oauth"] as const)("refuses a %s dataZone of company for a non-admin", (credential) => {
    const r = checkZones({ ...base, credential, dataZone: "company" });
    expect(r).toEqual({ ok: false, reason: expect.stringContaining("dataZone") });
  });
  it.each(["pat", "oauth"] as const)("refuses a %s access of company for a non-admin", (credential) => {
    const r = checkZones({ ...base, credential, access: "company" });
    expect(r).toEqual({ ok: false, reason: expect.stringContaining("access") });
  });
  it("allows company for a tenant admin", () => {
    expect(checkZones({ ...base, access: "company", dataZone: "company", ownerIsAdmin: true })).toEqual({ ok: true });
  });
  it("keeps access and dataZone independent", () => {
    expect(checkZones({ ...base, access: "personal", dataZone: "private" })).toEqual({ ok: true });
    expect(checkZones({ ...base, access: "private", dataZone: "company", ownerIsAdmin: true })).toEqual({ ok: true });
  });
  it("refuses an admin-token owned by a non-admin at any zone", () => {
    expect(checkZones({ ...base, credential: "admin-token" })).toEqual({ ok: false, reason: expect.stringContaining("admin-token") });
  });
  it("allows an admin-token owned by an admin", () => {
    expect(checkZones({ ...base, credential: "admin-token", dataZone: "company", ownerIsAdmin: true })).toEqual({ ok: true });
  });
});

describe("checkZones without a live recheck", () => {
  it.each([{ access: "company" }, { dataZone: "company" }] as const)("refuses %o even for a tenant admin, naming canRead", (wide) => {
    expect(checkZones({ ...base, ...wide, ownerIsAdmin: true, liveRecheck: false })).toEqual({ ok: false, reason: expect.stringContaining("canRead") });
  });
  it("allows private and personal, and treats an unset flag as recheck present", () => {
    expect(checkZones({ ...base, access: "personal", dataZone: "personal", liveRecheck: false })).toEqual({ ok: true });
    expect(checkZones({ ...base, dataZone: "company", ownerIsAdmin: true })).toEqual({ ok: true });
  });
});
