import { describe, expect, it } from "vitest";
import { AclSchema } from "../../src/acl.js";
import { PointerSchema } from "../../src/pointer.js";
import { PrincipalSchema } from "../../src/principal.js";
import { mostRestrictedZone, ZONES } from "../../src/zone.js";

const base = {
  id: "p", tenantId: "t", source: "s", address: "a", version: "v",
  contentHash: "b".repeat(64), zone: "team", acl: { version: 0 }, updatedAt: "2026-11-01T00:00:00Z",
};
const len = (n: number) => "x".repeat(n);

describe("length bounds are exact", () => {
  it.each([
    ["id", 256], ["tenantId", 256], ["source", 64], ["address", 2048], ["version", 256], ["title", 1024],
  ])("%s accepts %i and rejects one more", (key, max) => {
    expect(PointerSchema.safeParse({ ...base, [key]: len(max) }).success).toBe(true);
    expect(PointerSchema.safeParse({ ...base, [key]: len(max + 1) }).success).toBe(false);
  });
  it("hash must be exactly 64 lowercase hex chars", () => {
    expect(PointerSchema.safeParse({ ...base, contentHash: "b".repeat(63) }).success).toBe(false);
    expect(PointerSchema.safeParse({ ...base, contentHash: "b".repeat(65) }).success).toBe(false);
    expect(PointerSchema.safeParse({ ...base, contentHash: "B".repeat(64) }).success).toBe(false);
    expect(PointerSchema.safeParse({ ...base, contentHash: `z${"b".repeat(63)}` }).success).toBe(false);
  });
  it("deletedAt accepts a date or null and defaults to null", () => {
    expect(PointerSchema.parse({ ...base, deletedAt: "2026-11-02T00:00:00Z" }).deletedAt).toBe("2026-11-02T00:00:00Z");
    expect(PointerSchema.parse({ ...base, deletedAt: null }).deletedAt).toBeNull();
  });
});

describe("principal and acl bounds", () => {
  it("accepts 1000 groups and a 256 char id", () => {
    const groups = Array.from({ length: 1000 }, (_, i) => `g${i}`);
    expect(PrincipalSchema.safeParse({ id: len(256), tenantId: "t", groups }).success).toBe(true);
    expect(PrincipalSchema.safeParse({ id: len(257), tenantId: "t" }).success).toBe(false);
    expect(PrincipalSchema.safeParse({ id: "u", tenantId: len(257) }).success).toBe(false);
    expect(PrincipalSchema.safeParse({ id: "u", tenantId: "" }).success).toBe(false);
    expect(PrincipalSchema.safeParse({ id: "u", tenantId: "t", groups: [""] }).success).toBe(false);
  });
  it("acl ids are bounded and non-empty", () => {
    expect(AclSchema.safeParse({ version: 0, allowUsers: [len(256)] }).success).toBe(true);
    expect(AclSchema.safeParse({ version: 0, allowUsers: [len(257)] }).success).toBe(false);
    expect(AclSchema.safeParse({ version: 0, allowGroups: [""] }).success).toBe(false);
    expect(AclSchema.parse({ version: 0 }).allowUsers).toEqual([]);
  });
});

describe("zone order and errors", () => {
  it("is ordered most restricted first", () => expect([...ZONES]).toEqual(["personal", "team", "company"]));
  it("every pair resolves to the more restricted one, in any order", () => {
    expect(mostRestrictedZone(["company", "team"])).toBe("team");
    expect(mostRestrictedZone(["team", "company"])).toBe("team");
    expect(mostRestrictedZone(["company", "personal"])).toBe("personal");
    expect(mostRestrictedZone(["team", "personal"])).toBe("personal");
  });
  it("explains the empty-list error", () => {
    expect(() => mostRestrictedZone([])).toThrow(/at least one zone/);
  });
});
