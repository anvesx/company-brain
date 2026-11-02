import { describe, expect, it } from "vitest";
import { node, openStore } from "../support/helpers.js";

describe("nodes", () => {
  it("round-trips a node including props and unicode ids", () => {
    const s = openStore();
    const n = node("докумéнт-日本-😀", { props: { owner: "ana", b: "2", a: "1" }, kind: "repo" });
    s.upsertNode(n, 10);
    expect(s.node("t1", n.id)).toEqual(n);
    expect(s.node("t1", "nope")).toBeUndefined();
  });

  it("isolates tenants on every read", () => {
    const s = openStore();
    s.upsertNode(node("a"), 1);
    s.addEdge({ tenant: "t1", from: "a", to: "b", kind: "links-to", source: "x" }, 1);
    expect(s.node("t2", "a")).toBeUndefined();
    expect(s.history("t2", "a")).toEqual([]);
    expect(s.neighbors("t2", "a")).toEqual([]);
    expect(s.reach("t2", "a", { kinds: ["links-to"], depth: 2, limit: 10 })).toEqual([]);
  });

  it("same id may exist in two tenants independently", () => {
    const s = openStore();
    s.upsertNode(node("a", { title: "one" }), 1);
    s.upsertNode(node("a", { tenant: "t2", title: "two" }), 1);
    expect(s.node("t1", "a")?.title).toBe("one");
    expect(s.node("t2", "a")?.title).toBe("two");
  });

  it("identical upsert is a no-op, even with props in a different key order", () => {
    const s = openStore();
    s.upsertNode(node("a", { props: { x: "1", y: "2" } }), 1);
    s.upsertNode(node("a", { props: { y: "2", x: "1" } }), 5);
    expect(s.history("t1", "a")).toHaveLength(1);
  });

  it("every node kind is accepted", () => {
    const s = openStore();
    for (const kind of ["person", "team", "document", "repo", "channel", "ticket", "project"] as const) {
      s.upsertNode(node(kind, { kind }), 1);
      expect(s.node("t1", kind)?.kind).toBe(kind);
    }
  });

  it("a change to any single field supersedes the row", () => {
    const base = node("a", { props: { k: "v" } });
    const one: Partial<typeof base>[] = [{ title: "T" }, { version: "2" }, { source: "box" }, { address: "x" }, { kind: "repo" }, { props: { k: "w" } }];
    for (const c of one) {
      const s = openStore();
      s.upsertNode(base, 1);
      s.upsertNode({ ...base, ...c }, 2);
      expect(s.history("t1", "a")).toHaveLength(2);
    }
  });

  it("returns props keys in sorted order", () => {
    const s = openStore();
    s.upsertNode(node("a", { props: { m: "1", z: "2", b: "3" } }), 1);
    expect(Object.keys(s.node("t1", "a")?.props ?? {})).toEqual(["b", "m", "z"]);
  });

  it("an update at the current row's own validFrom is allowed; an earlier one rolls back cleanly", () => {
    const s = openStore();
    s.upsertNode(node("a", { title: "one" }), 10);
    s.upsertNode(node("a", { title: "two" }), 10);
    expect(s.node("t1", "a")?.title).toBe("two");
    expect(() => s.upsertNode(node("a", { title: "past" }), 5)).toThrow(/before/);
    s.upsertNode(node("a", { title: "three" }), 20);
    expect(s.node("t1", "a")?.title).toBe("three");
  });
});
