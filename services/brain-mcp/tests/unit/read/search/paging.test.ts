import { toAsync } from "@anvesx/graph-store";
import { afterAll, describe, expect, it } from "vitest";
import { MAX_CANDIDATES, search } from "../../../../src/tools/read/search.js";
import { edge, node, tempStore } from "../../../support/graph.js";

// Paging, truncation and budget of brain.search. Stored order: 2 hidden people, then 5 readable documents.
const store = tempStore();
const T = "org-p";
const ctx = { store: toAsync(store), caller: { tenant: T, user: "u-ada" }, accounts: async () => [] };
const run = (limit: number, cursor?: string) => search(ctx, { query: "zeta", limit, ...(cursor === undefined ? {} : { cursor }) });
afterAll(() => store.close());

node(store, T, "u-ada", "person", "Ada");
for (const h of ["p-h1", "p-h2"]) node(store, T, h, "person", `zeta hidden ${h}`);
for (let i = 1; i <= 5; i++) {
  node(store, T, `d${i}`, "document", `zeta doc ${i}`);
  edge(store, T, "u-ada", "can-read", `d${i}`);
}

describe("brain.search paging", () => {
  it("tops up past hidden rows, stops mid-scan at the limit and hands back a cursor that resumes after that row", async () => {
    const p1 = await run(3); // first scan = p-h1, p-h2, d1; top-up scan = d2.. and stops at d3 with d4, d5 unread
    expect(p1.nodes.map((n) => n.id)).toEqual(["d1", "d2", "d3"]); // never more than the limit
    expect(p1.next).toBeDefined(); // a cursor mid-page: more rows exist
    expect(p1).not.toHaveProperty("truncated"); // the page is full, so it is not partial
    const p2 = await run(3, p1.next); // the cursor skips exactly the rows already returned
    expect(p2.nodes.map((n) => n.id)).toEqual(["d4", "d5"]);
    expect(p2).not.toHaveProperty("next"); // last row of the last scan: nothing to continue
    expect(p2).not.toHaveProperty("truncated"); // fewer than the limit but exhausted, not budget-limited
  });

  it("gives no cursor when the limit is reached on the very last row of the last scan", async () => {
    // limit 5: scan 1 = h1, h2, d1..d3; top-up = d4, d5. d5 fills the page and is also the last row, so nothing follows.
    const r = await run(5);
    expect(r.nodes.map((n) => n.id)).toEqual(["d1", "d2", "d3", "d4", "d5"]);
    expect(r).not.toHaveProperty("next");
    expect(r).not.toHaveProperty("truncated");
  });

  it("stops a first page at the limit even when the first scan is full", async () => {
    // limit 2 over two readable rows at the head of a scan: exactly 2 returned, a cursor remains for d3..d5.
    const r = await search(ctx, { query: "zeta doc", limit: 2 });
    expect(r.nodes.map((n) => n.id)).toEqual(["d1", "d2"]);
    expect(r.next).toBeDefined();
    expect(r).not.toHaveProperty("truncated");
  });
});

describe("brain.search budget", () => {
  it("says truncated when the candidate budget runs out before the page fills, and the cursor continues", async () => {
    const big = tempStore();
    const bctx = { ...ctx, store: toAsync(big), caller: { tenant: "org-big", user: "u-ada" } };
    for (let i = 0; i < MAX_CANDIDATES + 50; i++) node(big, "org-big", `h${i}`, "person", `zeta hidden ${i}`);
    const r = await search(bctx, { query: "zeta", limit: 5 });
    expect(r.nodes).toEqual([]); // every candidate was hidden
    expect(r.truncated).toBe(true); // partial because of the budget, not because matches ran out
    expect(r.next).toBeDefined(); // and the cursor still reaches the rest
    big.close();
  });
});
