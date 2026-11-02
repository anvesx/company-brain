import { describe, expect, it } from "vitest";
import { principal, syncAccess } from "../../../src/write/access.js";
import { ctxOf } from "./ctx.js";

const edge = (from: string, kind: "can-read" | "mentions", source = "folder") => ({ tenant: "t1", from, to: "d", kind, source }) as const;

describe("principal", () => {
  it("writes a bare node once, remembers its kind, refuses a kind clash", () => {
    const c = ctxOf();
    expect(principal(c, "person", "ana")).toBe("ana");
    expect(c.principals.get("ana")).toBe("person");
    expect(c.deps.store.node("t1", "ana")).toEqual({
      tenant: "t1",
      id: "ana",
      kind: "person",
      source: "folder",
      address: "ana",
      title: "ana",
      version: "",
      props: {},
    });
    expect(() => principal(c, "team", "ana")).toThrow("ana is already a person, not a team");
  });
});

describe("syncAccess", () => {
  it("closes stale edges of its own source only", () => {
    const c = ctxOf();
    const { store } = c.deps;
    for (const e of [edge("old", "can-read"), edge("theirs", "can-read", "else"), edge("m", "mentions")]) store.addEdge(e, 1);
    syncAccess(c, "d", { allowUsers: ["ana"], allowGroups: [], version: 1 });
    const from = store.neighbors("t1", "d", { kind: "can-read", dir: "in" }).map((e) => e.from);
    expect(from.sort()).toEqual(["ana", "theirs"]);
    expect(store.neighbors("t1", "d", { kind: "mentions", dir: "in" })).toHaveLength(1);
  });
});
