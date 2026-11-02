import type { GraphNode } from "@anvesx/graph-store";
import { describe, expect, it } from "vitest";
import type { SyncError } from "../../../src/index.js";
import { writeRoot } from "../../../src/write/root.js";
import { ctxOf } from "./ctx.js";

const base: GraphNode = { tenant: "t1", id: "connector:folder", kind: "team", source: "folder", address: "a", title: "T", version: "1", props: {} };
const thrown = (f: () => void) => {
  try {
    f();
  } catch (e) {
    return { code: (e as SyncError).code, message: (e as Error).message };
  }
};

describe("writeRoot", () => {
  it("writes a bare project node and refuses a clashing one", () => {
    const c = ctxOf();
    writeRoot(c);
    expect(c.deps.store.node("t1", "connector:folder")).toEqual({
      tenant: "t1",
      id: "connector:folder",
      kind: "project",
      source: "folder",
      address: "connector:folder",
      title: "folder",
      version: "",
      props: {},
    });
    c.deps.store.upsertNode(base, 5000);
    expect(thrown(() => writeRoot(c))).toEqual({ code: "BAD_INPUT", message: "connector:folder is already a team, not a project" });
    c.deps.store.upsertNode({ ...base, kind: "project", source: "x" }, 6000);
    expect(thrown(() => writeRoot(c))).toEqual({ code: "BAD_INPUT", message: "connector:folder belongs to source x" });
  });
});
