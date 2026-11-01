import { describe, expect, it } from "vitest";
import { PointerSchema } from "../../src/pointer.js";

const ok = {
  id: "p1", tenantId: "t1", source: "gdrive", address: "drive://abc", version: "7",
  contentHash: "a".repeat(64), zone: "team", acl: { version: 1 }, updatedAt: "2026-11-01T00:00:00Z",
};

describe("PointerSchema", () => {
  it("accepts a valid pointer and fills defaults", () => {
    const p = PointerSchema.parse(ok);
    expect(p.title).toBe("");
    expect(p.deletedAt).toBeNull();
    expect(p.acl.allowUsers).toEqual([]);
  });
  it("rejects body text (strict) so content cannot leak in", () => {
    expect(PointerSchema.safeParse({ ...ok, body: "secret text" }).success).toBe(false);
  });
  it("rejects a bad hash, empty id, bad zone and bad date", () => {
    for (const bad of [{ contentHash: "xyz" }, { id: "" }, { zone: "x" }, { updatedAt: "yesterday" }])
      expect(PointerSchema.safeParse({ ...ok, ...bad }).success).toBe(false);
  });
  it("handles unicode ids and huge addresses", () => {
    expect(PointerSchema.safeParse({ ...ok, id: "文档-1" }).success).toBe(true);
    expect(PointerSchema.safeParse({ ...ok, address: "x".repeat(2049) }).success).toBe(false);
  });
});
