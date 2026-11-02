import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { AclSchema } from "../../../src/access/acl.js";
import { PrincipalSchema } from "../../../src/access/principal.js";

// Grapheme units never produce a lone surrogate, so build one explicitly: a surrogate code unit
// between two well-formed strings is always unpaired (neither neighbour can supply its partner).
const part = fc.string({ unit: "grapheme", maxLength: 4 });
const lone = fc.tuple(part, fc.integer({ min: 0xd800, max: 0xdfff }), part).map(([a, c, z]) => a + String.fromCharCode(c) + z);
const wellFormed = fc.string({ unit: "grapheme", minLength: 1, maxLength: 8 });

describe("ids reject lone surrogates", () => {
  it("generator really yields malformed strings", () => {
    fc.assert(
      fc.property(lone, (id) => {
        expect(id.isWellFormed()).toBe(false);
      }),
    );
  });
  it("rejects every generated malformed id in principal and acl fields", () => {
    fc.assert(
      fc.property(lone, (id) => {
        expect(PrincipalSchema.safeParse({ id, tenantId: "t" }).success).toBe(false);
        expect(PrincipalSchema.safeParse({ id: "u", tenantId: id }).success).toBe(false);
        expect(PrincipalSchema.safeParse({ id: "u", tenantId: "t", groups: [id] }).success).toBe(false);
        expect(AclSchema.safeParse({ allowUsers: [id], version: 0 }).success).toBe(false);
        expect(AclSchema.safeParse({ allowGroups: [id], version: 0 }).success).toBe(false);
      }),
      { numRuns: 500 },
    );
  });
  it("still accepts every generated well-formed id", () => {
    fc.assert(
      fc.property(wellFormed, (id) => {
        expect(PrincipalSchema.safeParse({ id, tenantId: "t", groups: [id] }).success).toBe(true);
        expect(AclSchema.safeParse({ allowUsers: [id], allowGroups: [id], version: 0 }).success).toBe(true);
      }),
      { numRuns: 500 },
    );
  });
  it("rejects the exact review case, a lone high surrogate", () => {
    expect(PrincipalSchema.safeParse({ id: "\ud800", tenantId: "t" }).success).toBe(false);
    expect(PrincipalSchema.safeParse({ id: "😀", tenantId: "t" }).success).toBe(true);
  });
});
