import { describe, expect, it } from "vitest";
import { AclSchema } from "../../src/acl.js";
import { PrincipalSchema } from "../../src/principal.js";

describe("PrincipalSchema", () => {
  it("defaults groups to empty", () => {
    expect(PrincipalSchema.parse({ id: "u", tenantId: "t" }).groups).toEqual([]);
  });
  it("rejects empty ids and oversize group lists", () => {
    expect(PrincipalSchema.safeParse({ id: "", tenantId: "t" }).success).toBe(false);
    const groups = Array.from({ length: 1001 }, (_, i) => `g${i}`);
    expect(PrincipalSchema.safeParse({ id: "u", tenantId: "t", groups }).success).toBe(false);
  });
});

describe("AclSchema", () => {
  it("requires a non-negative integer version", () => {
    expect(AclSchema.safeParse({ version: -1 }).success).toBe(false);
    expect(AclSchema.safeParse({ version: 1.5 }).success).toBe(false);
    expect(AclSchema.parse({ version: 0 }).allowGroups).toEqual([]);
  });
});
