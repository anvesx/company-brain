import { describe, expect, it } from "vitest";
import { visibleGraph } from "../../../src/index.js";
import { KEY, node, openStore, write } from "../../support/store.js";
import { seedWorld } from "../../support/world.js";

describe("rule 2: groups and categories", () => {
  it("documents are grouped by kind and source; every other kind by kind alone", () => {
    const store = openStore();
    seedWorld(store);
    const page = visibleGraph(store, { cursorKey: KEY, tenant: "t1", user: "alice" });
    const groups = Object.fromEntries(page.nodes.map((n) => [n.id, n.group]));
    expect(groups).toEqual({
      alice: "person",
      bob: "person",
      eng: "team",
      "d-shared": "document:gdrive",
      "d-alice": "document:notion",
      "p-launch": "project",
      "r-api": "repo",
    });
  });

  it("categories count visible nodes per group, sorted by group name", () => {
    const store = openStore();
    seedWorld(store);
    expect(visibleGraph(store, { cursorKey: KEY, tenant: "t1", user: "alice" }).categories).toEqual([
      { group: "document:gdrive", count: 1 },
      { group: "document:notion", count: 1 },
      { group: "person", count: 2 },
      { group: "project", count: 1 },
      { group: "repo", count: 1 },
      { group: "team", count: 1 },
    ]);
  });

  it("each connector is its own cluster: three sources give three document groups", () => {
    const store = openStore();
    const docs = ["gdrive", "notion", "github", "notion"].map((source, i) => node("t1", `d${i}`, "document", source));
    write(
      store,
      1,
      [node("t1", "u", "person", "slack"), ...docs],
      docs.map((d) => ({ tenant: "t1", from: "u", to: d.id, kind: "can-read", source: "t" })),
    );
    const counts = visibleGraph(store, { cursorKey: KEY, tenant: "t1", user: "u" }).categories;
    expect(counts.filter((c) => c.group.startsWith("document:"))).toEqual([
      { group: "document:gdrive", count: 1 },
      { group: "document:github", count: 1 },
      { group: "document:notion", count: 2 },
    ]);
  });

  it("the person's source does not split principals: slack and github people share one group", () => {
    const store = openStore();
    write(
      store,
      1,
      [node("t1", "u", "person", "slack"), node("t1", "v", "person", "github"), node("t1", "d", "document", "gdrive")],
      [
        { tenant: "t1", from: "u", to: "d", kind: "can-read", source: "t" },
        { tenant: "t1", from: "v", to: "d", kind: "can-read", source: "t" },
      ],
    );
    expect(visibleGraph(store, { cursorKey: KEY, tenant: "t1", user: "u" }).categories).toContainEqual({ group: "person", count: 2 });
  });
});
