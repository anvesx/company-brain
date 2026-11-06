import { describe, expect, it } from "vitest";
import { visibleGraph } from "../../../src/index.js";
import { edgeKeys, KEY, openStore } from "../../support/store.js";
import { ALICE_EDGES, ALICE_NODES, BOB_EDGES, BOB_NODES, seedWorld } from "../../support/world.js";

const world = () => {
  const store = openStore();
  seedWorld(store);
  return store;
};

describe("rule 1: the visible set", () => {
  it("alice sees herself, her team, what they can read, its projects and repos, and its other readers", async () => {
    const page = await visibleGraph(world(), { cursorKey: KEY, tenant: "t1", user: "alice" });
    expect(page.nodes.map((n) => n.id)).toEqual(ALICE_NODES);
    expect(edgeKeys(page.edges)).toEqual(ALICE_EDGES);
  });

  it("bob sees a different set from the same graph, and alice is not in it", async () => {
    const page = await visibleGraph(world(), { cursorKey: KEY, tenant: "t1", user: "bob" });
    expect(page.nodes.map((n) => n.id)).toEqual(BOB_NODES);
    expect(edgeKeys(page.edges)).toEqual(BOB_EDGES);
  });

  it("a document nobody gave alice is not a node, not an edge end and not a count", async () => {
    const page = await visibleGraph(world(), { cursorKey: KEY, tenant: "t1", user: "alice" });
    const ends = page.edges.flatMap((e) => [e.from, e.to]);
    for (const hidden of ["d-bob", "d-secret", "p-hidden", "carol"]) {
      expect(page.nodes.some((n) => n.id === hidden)).toBe(false);
      expect(ends).not.toContain(hidden);
    }
    expect(page.categories.reduce((sum, c) => sum + c.count, 0)).toBe(ALICE_NODES.length);
  });

  it("belongs-to adds only projects and repos: an unreadable document a readable one belongs to stays hidden", async () => {
    const page = await visibleGraph(world(), { cursorKey: KEY, tenant: "t1", user: "alice" });
    expect(page.nodes.map((n) => n.id)).toContain("r-api");
    expect(page.nodes.map((n) => n.id)).not.toContain("d-secret");
  });

  it("a user with no node and no edges sees an empty graph", async () => {
    expect(await visibleGraph(world(), { cursorKey: KEY, tenant: "t1", user: "nobody" })).toEqual({ nodes: [], edges: [], categories: [] });
  });

  it("tenants never mix: the same user id in t2 sees only t2 rows", async () => {
    const page = await visibleGraph(world(), { cursorKey: KEY, tenant: "t2", user: "alice" });
    expect(page.nodes.map((n) => [n.id, n.title])).toEqual([["d-alice", "Other tenant"]]);
    expect(page.edges).toEqual([]);
  });

  it("a tombstoned team stops granting what it could read", async () => {
    const store = world();
    store.tombstone("t1", "eng", 2_000);
    const ids = (await visibleGraph(store, { cursorKey: KEY, tenant: "t1", user: "alice" })).nodes.map((n) => n.id);
    expect(ids).toEqual(["alice", "d-alice", "r-api"]);
  });
});

describe("rule 7: props are never sent", () => {
  it("a node carries exactly id, kind, source, title and group; an edge exactly from, to and kind", async () => {
    const page = await visibleGraph(world(), { cursorKey: KEY, tenant: "t1", user: "alice" });
    for (const n of page.nodes) expect(Object.keys(n).sort()).toEqual(["group", "id", "kind", "source", "title"]);
    for (const e of page.edges) expect(Object.keys(e).sort()).toEqual(["from", "kind", "to"]);
  });

  it("no address, version or prop value appears anywhere in the page", async () => {
    const json = JSON.stringify(await visibleGraph(world(), { cursorKey: KEY, tenant: "t1", user: "alice" }));
    expect(json).not.toMatch(/private\.example\.com|"v-|prop-of-/);
  });
});
