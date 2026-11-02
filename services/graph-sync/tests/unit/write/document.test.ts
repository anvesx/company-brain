import type { GraphNode } from "@anvesx/graph-store";
import { describe, expect, it } from "vitest";
import type { SyncError } from "../../../src/index.js";
import { syncDocument, writeNode } from "../../../src/write/document.js";
import { doc } from "../../docs.js";
import { ctxOf } from "./ctx.js";

const thrown = (f: () => void) => {
  try {
    f();
  } catch (e) {
    return { code: (e as SyncError).code, message: (e as Error).message };
  }
};
const base: GraphNode = { tenant: "t1", id: "n", kind: "document", source: "folder", address: "a", title: "T", version: "1", props: { k: "v" } };

describe("writeNode", () => {
  it("skips identical content and writes on every kind of change", () => {
    const c = ctxOf();
    writeNode(c, base);
    writeNode(c, { ...base, props: { k: "v" } });
    expect(c.report.nodes).toBe(1);
    const changes: Partial<GraphNode>[] = [
      { kind: "ticket" },
      { source: "other" },
      { address: "b" },
      { title: "U" },
      { version: "2" },
      { props: { k: "w" } },
      { props: { j: "v" } },
      { props: { k: "v", j: "v" } },
      { props: {} },
    ];
    for (const ch of changes) {
      writeNode(c, { ...base, ...ch });
      writeNode(c, base);
    }
    expect(c.report.nodes).toBe(1 + 2 * changes.length);
  });
});

describe("syncDocument", () => {
  it("refuses a node of another source or kind, with the reason", () => {
    const c = ctxOf();
    c.deps.store.upsertNode({ ...base, id: "folder/a", source: "other" }, 1);
    expect(thrown(() => syncDocument(c, doc("a")))).toEqual({ code: "BAD_INPUT", message: "folder/a belongs to source other" });
    c.deps.store.upsertNode({ ...base, id: "folder/b", kind: "ticket" }, 1);
    expect(thrown(() => syncDocument(c, doc("b")))).toEqual({ code: "BAD_INPUT", message: "folder/b is already a ticket, not a document" });
  });

  it("adds the belongs-to edge unless that exact edge exists", () => {
    const c = ctxOf();
    syncDocument(c, doc("a"));
    syncDocument(c, doc("a"));
    expect(c.report.edges).toBe(1);
    c.deps.store.addEdge({ tenant: "t1", from: "folder/b", to: "connector:other", kind: "belongs-to", source: "folder" }, 1);
    c.deps.store.addEdge({ tenant: "t1", from: "folder/b", to: "connector:folder", kind: "links-to", source: "folder" }, 1);
    syncDocument(c, doc("b"));
    const to = c.deps.store.neighbors("t1", "folder/b", { kind: "belongs-to", dir: "out" }).map((e) => e.to);
    expect(to.sort()).toEqual(["connector:folder", "connector:other"]);
  });
});
