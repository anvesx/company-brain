import type { GraphStore } from "@anvesx/graph-store";
import { describe, expect, it } from "vitest";
import { visibleGraph } from "../../../src/index.js";
import { edge, edgeKeys, KEY, node, openStore } from "../../support/store.js";
import { ALICE_EDGES, ALICE_NODES, seedWorld } from "../../support/world.js";

/**
 * The world at T0 = 1,000, then three later writes:
 *   2,000  d-late appears and alice can read it; d-alice is renamed
 *   3,000  eng loses can-read on d-shared; r-api is tombstoned
 */
function timeline(): GraphStore {
  const store = openStore();
  seedWorld(store);
  store.upsertNode(node("t1", "d-late", "document", "gdrive"), 2_000);
  store.addEdge(edge("t1", "alice", "d-late", "can-read"), 2_000);
  store.upsertNode(node("t1", "d-alice", "document", "notion", { title: "Renamed" }), 2_000);
  store.removeEdge(edge("t1", "eng", "d-shared", "can-read"), 3_000);
  store.tombstone("t1", "r-api", 3_000);
  return store;
}

const view = (store: GraphStore, asOf?: number) =>
  visibleGraph(store, { cursorKey: KEY, tenant: "t1", user: "alice", ...(asOf === undefined ? {} : { asOf }) });

describe("rule 8: asOf draws the graph as it was", () => {
  it("before the later writes, the view equals the original world", () => {
    const page = view(timeline(), 1_500);
    expect(page.nodes.map((n) => n.id)).toEqual(ALICE_NODES);
    expect(edgeKeys(page.edges)).toEqual(ALICE_EDGES);
  });

  it("titles come from the row valid at asOf", () => {
    const title = (asOf?: number) => view(timeline(), asOf).nodes.find((n) => n.id === "d-alice")?.title;
    expect(title(1_500)).toBe("Title of d-alice");
    expect(title(2_500)).toBe("Renamed");
  });

  it("between the writes, the new document is in and the old grant still holds", () => {
    const ids = view(timeline(), 2_500).nodes.map((n) => n.id);
    expect(ids).toEqual(["alice", "bob", "d-alice", "d-late", "d-shared", "eng", "p-launch", "r-api"]);
  });

  it("without asOf, the view is now: the lost grant takes d-shared, its project and its reader with it", () => {
    const page = view(timeline());
    expect(page.nodes.map((n) => n.id)).toEqual(["alice", "d-alice", "d-late", "eng"]);
    expect(edgeKeys(page.edges)).toEqual(["alice -authored-> d-alice", "alice -can-read-> d-alice", "alice -can-read-> d-late", "alice -member-of-> eng"]);
  });

  it("before anything existed, the view is empty", () => {
    expect(view(timeline(), 500)).toEqual({ nodes: [], edges: [], categories: [] });
  });
});
