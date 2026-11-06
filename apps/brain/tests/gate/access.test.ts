import { createGraphStore, type GraphNode, toAsync } from "@anvesx/graph-store";
import { describe, expect, it } from "vitest";
import { canRead, readableDocuments } from "../../src/gate/access.js";

const doc = (id: string): GraphNode => ({ tenant: "t", id, kind: "document", source: "drive", address: id, title: `T ${id}`, version: "1", props: {} });
const who = (id: string, kind: "person" | "team" = "person"): GraphNode => ({ ...doc(id), kind, source: "drive" });

function graph() {
  const s = createGraphStore({ path: ":memory:" });
  for (const n of [doc("d1"), doc("d2"), doc("d3"), who("ann"), who("bob"), who("eng", "team")]) s.upsertNode(n, 1);
  s.addEdge({ tenant: "t", from: "ann", to: "d1", kind: "can-read", source: "drive" }, 1);
  s.addEdge({ tenant: "t", from: "eng", to: "d2", kind: "can-read", source: "drive" }, 1);
  s.addEdge({ tenant: "t", from: "bob", to: "eng", kind: "member-of", source: "drive" }, 1);
  return toAsync(s);
}

describe("access", () => {
  it("lists documents readable directly or through a team", async () => {
    const s = graph();
    expect((await readableDocuments(s, "t", "ann")).map((d) => d.id)).toEqual(["d1"]);
    expect((await readableDocuments(s, "t", "bob")).map((d) => d.id)).toEqual(["d2"]);
  });
  it("denies a stranger and another tenant", async () => {
    const s = graph();
    expect(await readableDocuments(s, "t", "zed")).toEqual([]);
    expect(await readableDocuments(s, "other", "ann")).toEqual([]);
    expect(await canRead(s, "t", "ann", "d2")).toBe(false);
  });
  it("allows a team member on a team document", async () => {
    expect(await canRead(graph(), "t", "bob", "d2")).toBe(true);
  });
  it("stops reading a document after its edge is removed", async () => {
    const s = graph();
    await s.removeEdge({ tenant: "t", from: "ann", to: "d1", kind: "can-read", source: "drive" }, 2);
    expect(await canRead(s, "t", "ann", "d1")).toBe(false);
  });
});
