import { describe, expect, it } from "vitest";
import { createRegistry, RegistryError } from "../../src/index.js";
import { ptr } from "../fixtures.js";

const code = (fn: () => unknown): unknown => {
  try { fn(); } catch (e) { expect(e).toBeInstanceOf(RegistryError); return (e as RegistryError).code; }
  return "no-throw";
};

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
    const next = ptr({ version: "v2", title: "T2", address: "x://2", zone: "company", source: "s2",
      acl: { allowUsers: ["a", "b"], allowGroups: ["g"], version: 5 }, updatedAt: "2026-11-02T00:00:00Z" });
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

describe("validation", () => {
  const r = createRegistry(":memory:");
  it.each([
    ["bad hash", ptr({ contentHash: "xyz" })],
    ["bad zone", { ...ptr(), zone: "nope" }],
    ["body text field", { ...ptr(), body: "secret text" }],
    ["bad date", ptr({ updatedAt: "yesterday" })],
    ["negative acl version", ptr({ acl: { allowUsers: [], allowGroups: [], version: -1 } })],
    ["address too long", ptr({ address: "x".repeat(2049) })],
  ])("%s throws INVALID", (_n, bad) => {
    expect(code(() => r.upsert(bad as never))).toBe("INVALID");
  });
  it.each([null, undefined, 42, "str", []])("non-object %j throws INVALID", (bad) => {
    expect(code(() => r.upsert(bad as never))).toBe("INVALID");
  });
  it("invalid input writes nothing", () => {
    expect(r.list({ tenantId: "t1" })).toEqual([]);
  });
  it("INVALID error carries a message and name", () => {
    try { r.upsert(null as never); } catch (e) {
      expect((e as Error).name).toBe("RegistryError");
      expect((e as Error).message.length).toBeGreaterThan(0);
    }
  });
});
