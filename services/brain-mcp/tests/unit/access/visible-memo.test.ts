import { toAsync } from "@anvesx/graph-store";
import { describe, expect, it } from "vitest";
import { viewer } from "../../../src/access/visible.js";
import { edge, node, tempStore } from "../../support/graph.js";

// "Every answer is remembered for the life of one viewer." Proven by closing the store: a remembered answer needs no read.
const ORG = "org-m";
const seed = () => {
  const store = tempStore();
  node(store, ORG, "u-max", "person", "Max");
  node(store, ORG, "team-m", "team", "M team");
  edge(store, ORG, "u-max", "member-of", "team-m");
  node(store, ORG, "doc-a", "document", "A");
  edge(store, ORG, "team-m", "can-read", "doc-a");
  node(store, ORG, "doc-b", "document", "B");
  return store;
};

describe("viewer memo", () => {
  it("answers repeated and overlapping ids from memory, without touching the store again", async () => {
    const store = seed();
    const v = await viewer(toAsync(store), { tenant: ORG, user: "u-max" });
    const first = await v.seesMany([{ id: "doc-a" }, { id: "doc-b" }, { id: "gone" }]);
    expect(first).toEqual([true, false, false]);
    store.close(); // any further store read now throws
    expect(await v.seesMany([{ id: "doc-a" }, { id: "doc-b" }, { id: "gone" }])).toEqual(first);
    expect(await v.sees("doc-a")).toBe(true);
  });

  it("an empty batch, or one with kinds that need no lookup, reads nothing", async () => {
    for (const bulk of [false, true]) {
      const store = seed();
      const v = await viewer(toAsync(store), { tenant: ORG, user: "u-max" }, undefined, bulk);
      store.close();
      expect(await v.seesMany([])).toEqual([]);
      expect(await v.seesMany([{ id: "x", kind: "channel" }])).toEqual([false]);
    }
  });
});
