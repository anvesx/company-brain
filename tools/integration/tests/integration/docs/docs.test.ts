import { join } from "node:path";
import type { EdgeKind, GraphNode, GraphStore } from "@anvesx/graph-store";
import { describe, expect, it } from "vitest";
import { graphDocs, sourceDocs } from "../../../src/graph-docs.js";
import { openStore, TENANT, tmp } from "../../support/world.js";

const node = (id: string, props: Record<string, string> = {}): GraphNode => ({
  tenant: TENANT,
  id,
  kind: "document",
  source: "docs",
  address: `${id}.md`,
  title: `T ${id}`,
  version: "v1",
  props,
});
const link = (s: GraphStore, from: string, to: string, kind: EdgeKind) => s.addEdge({ tenant: TENANT, from, to, kind, source: "docs" }, 1);
const fresh = (): GraphStore => {
  const s = openStore(join(tmp(), "g.db"));
  s.upsertNode({ ...node("connector:docs"), kind: "project" }, 1);
  return s;
};

describe("graph-docs listing, edge cases", () => {
  it("lists only belongs-to in-edges of the connector, skips edges to missing nodes", () => {
    const s = fresh();
    s.upsertNode(node("d1"), 1);
    s.upsertNode(node("other"), 1);
    link(s, "d1", "connector:docs", "belongs-to");
    link(s, "ghost", "connector:docs", "belongs-to");
    link(s, "other", "connector:docs", "links-to");
    link(s, "connector:docs", "other", "belongs-to");
    expect(graphDocs(s, TENANT, "docs").map((n) => n.id)).toEqual(["d1"]);
    expect(sourceDocs(s, TENANT, "docs").map((d) => d.id)).toEqual(["d1"]);
  });

  it("returns readers sorted, only from can-read in-edges", () => {
    const s = fresh();
    s.upsertNode(node("d1"), 1);
    link(s, "d1", "connector:docs", "belongs-to");
    for (const u of ["user:zed", "user:amy", "user:mia"]) link(s, u, "d1", "can-read");
    link(s, "user:bob", "d1", "mentions");
    link(s, "d1", "user:out", "can-read");
    expect(sourceDocs(s, TENANT, "docs")[0]?.readers).toEqual(["user:amy", "user:mia", "user:zed"]);
  });

  it("carries updatedAt only when the node has it", () => {
    const s = fresh();
    s.upsertNode(node("d1", { updatedAt: "2026-01-02" }), 1);
    s.upsertNode(node("d2"), 1);
    link(s, "d1", "connector:docs", "belongs-to");
    link(s, "d2", "connector:docs", "belongs-to");
    const [a, b] = sourceDocs(s, TENANT, "docs").sort((x, y) => x.id.localeCompare(y.id));
    expect(a).toStrictEqual({ id: "d1", title: "T d1", address: "d1.md", version: "v1", updatedAt: "2026-01-02", readers: [] });
    expect(b).toStrictEqual({ id: "d2", title: "T d2", address: "d2.md", version: "v1", readers: [] });
  });
});
