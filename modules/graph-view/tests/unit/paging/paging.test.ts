import type { GraphStore } from "@anvesx/graph-store";
import { describe, expect, it } from "vitest";
import { type GraphViewPage, visibleGraph } from "../../../src/index.js";
import { chain, edgeKeys, KEY, openStore } from "../../support/store.js";

/** Follows `next` until the last page and returns every page. */
function allPages(store: GraphStore, limit: number): GraphViewPage[] {
  const pages = [visibleGraph(store, { cursorKey: KEY, tenant: "t1", user: "u", limit })];
  let next = pages[0]?.next;
  while (next !== undefined) {
    const page = visibleGraph(store, { cursorKey: KEY, tenant: "t1", user: "u", limit, cursor: next });
    pages.push(page);
    next = page.next;
  }
  return pages;
}

describe("rule 3: cursor paging on node id", () => {
  it("pages walk the nodes in id order and together equal the single-page answer", () => {
    const store = openStore();
    chain(store, 24);
    const whole = visibleGraph(store, { cursorKey: KEY, tenant: "t1", user: "u" });
    const pages = allPages(store, 10);
    expect(pages.map((p) => p.nodes.length)).toEqual([10, 10, 5]);
    expect(pages.flatMap((p) => p.nodes)).toEqual(whole.nodes);
    expect(whole.nodes.map((n) => n.id)).toEqual([...whole.nodes.map((n) => n.id)].sort());
  });

  it("each edge is sent once, on the page that completes it, with both ends already sent", () => {
    const store = openStore();
    chain(store, 24);
    const sent = new Set<string>();
    const all: GraphViewPage["edges"] = [];
    for (const page of allPages(store, 10)) {
      const here = new Set(page.nodes.map((n) => n.id));
      for (const id of here) sent.add(id);
      for (const e of page.edges) {
        expect(sent.has(e.from) && sent.has(e.to)).toBe(true);
        expect(here.has(e.from) || here.has(e.to)).toBe(true);
      }
      all.push(...page.edges);
    }
    expect(edgeKeys(all)).toEqual(edgeKeys(visibleGraph(store, { cursorKey: KEY, tenant: "t1", user: "u" }).edges));
    expect(new Set(edgeKeys(all)).size).toBe(all.length);
  });

  it("categories are totals on every page, not per-page counts", () => {
    const store = openStore();
    chain(store, 24);
    for (const page of allPages(store, 10)) {
      expect(page.categories).toEqual([
        { group: "document:gdrive", count: 24 },
        { group: "person", count: 1 },
      ]);
    }
  });

  it("the last page has no next; a page that ends exactly at the end has none either", () => {
    const store = openStore();
    chain(store, 9);
    expect(visibleGraph(store, { cursorKey: KEY, tenant: "t1", user: "u", limit: 10 }).next).toBeUndefined();
    expect(allPages(store, 5).map((p) => p.next === undefined)).toEqual([false, true]);
  });
});
