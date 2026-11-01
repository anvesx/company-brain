import { describe, expect, it } from "vitest";
import { createRegistry } from "../../src/index.js";
import { ptr } from "../fixtures.js";

describe("change detection", () => {
  it("created, unchanged, then updated on each tracked field", () => {
    const r = createRegistry(":memory:");
    expect(r.upsert(ptr()).change).toBe("created");
    expect(r.upsert(ptr()).change).toBe("unchanged");
    expect(r.upsert(ptr({ contentHash: "b".repeat(64) })).change).toBe("updated");
    expect(r.upsert(ptr({ contentHash: "b".repeat(64) })).change).toBe("unchanged");
    expect(r.upsert(ptr({ contentHash: "b".repeat(64), version: "v2" })).change).toBe("updated");
    const acl = { allowUsers: [], allowGroups: [], version: 2 };
    expect(r.upsert(ptr({ contentHash: "b".repeat(64), version: "v2", acl })).change).toBe("updated");
  });
  it("unchanged does not write: stored row keeps old title", () => {
    const r = createRegistry(":memory:");
    r.upsert(ptr({ title: "old" }));
    const res = r.upsert(ptr({ title: "new" }));
    expect(res.change).toBe("unchanged");
    expect(res.pointer.title).toBe("old");
    expect(r.get("t1", "doc-1")?.title).toBe("old");
  });
  it("updated writes every field", () => {
    const r = createRegistry(":memory:");
    r.upsert(ptr());
    const next = ptr({
      version: "v2",
      title: "T2",
      address: "x://2",
      zone: "company",
      source: "s2",
      acl: { allowUsers: ["a", "b"], allowGroups: ["g"], version: 5 },
      updatedAt: "2026-11-02T00:00:00Z",
    });
    expect(r.upsert(next).pointer).toEqual(next);
    expect(r.get("t1", "doc-1")).toEqual(next);
  });
  it("returns created pointer with defaults applied", () => {
    const r = createRegistry(":memory:");
    const { title: _t, deletedAt: _d, ...raw } = ptr();
    const out = r.upsert(raw as never).pointer;
    expect(out.title).toBe("");
    expect(out.deletedAt).toBeNull();
  });
});
