import { describe, expect, it } from "vitest";
import { visibleGraph } from "../../../src/index.js";
import { chain, KEY, openStore } from "../../support/store.js";

describe("rule 3: limit bounds", () => {
  it("defaults to 5,000 nodes and says next when there are more", () => {
    const store = openStore();
    chain(store, 5_000); // 5,001 visible nodes: u plus 5,000 documents
    const first = visibleGraph(store, { cursorKey: KEY, tenant: "t1", user: "u" });
    expect(first.nodes).toHaveLength(5_000);
    expect(first.next).toBeTypeOf("string");
    const second = visibleGraph(store, { cursorKey: KEY, tenant: "t1", user: "u", cursor: first.next });
    expect(second.nodes).toHaveLength(1);
    expect(second.next).toBeUndefined();
  }, 60_000);

  it("accepts the bounds 1 and 20,000", () => {
    const store = openStore();
    chain(store, 3);
    expect(visibleGraph(store, { cursorKey: KEY, tenant: "t1", user: "u", limit: 1 }).nodes).toHaveLength(1);
    expect(visibleGraph(store, { cursorKey: KEY, tenant: "t1", user: "u", limit: 20_000 }).nodes).toHaveLength(4);
  });

  // The store's own typed error is reused, so the route maps one code to 400 for both packages.
  it.each([0, -1, 20_001, 1.5, Number.NaN, Number.POSITIVE_INFINITY])("rejects limit %s with GraphError BAD_INPUT", (limit) => {
    const store = openStore();
    chain(store, 3);
    expect(() => visibleGraph(store, { cursorKey: KEY, tenant: "t1", user: "u", limit })).toThrow(
      expect.objectContaining({ name: "GraphError", code: "BAD_INPUT" }),
    );
  });
});
