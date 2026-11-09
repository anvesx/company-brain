import type { AsyncGraphStore, NodeKind } from "@anvesx/graph-store";
import { describe, expect, it } from "vitest";
import { MAX_CANDIDATES, search } from "../../../src/tools/read/search.js";
import { storeFactories } from "../../support/server.js";
import { counted, seed } from "./count.js";

const T = "org-search";
// Every title holds "alpha" except the callers' own, so a caller never finds themselves.
const put = (s: AsyncGraphStore, id: string, kind: NodeKind, title = `alpha ${id}`) =>
  s.upsertNode({ tenant: T, id, kind, source: "test", address: `x://${id}`, title, version: "1", props: {} }, 1);
const ctxFor = (store: AsyncGraphStore, user: string) => ({ store, caller: { tenant: T, user }, accounts: async () => [] });
type Page = { nodes: { id: string }[]; next?: string; truncated?: boolean };

/** Every page of one search, in order, stopping after `max` pages. */
async function pages(store: AsyncGraphStore, user: string, limit: number, max: number): Promise<Page[]> {
  const out: Page[] = [];
  let cursor: string | undefined;
  do {
    const page: Page = await search(ctxFor(store, user), { query: "alpha", limit, ...(cursor === undefined ? {} : { cursor }) });
    out.push(page);
    cursor = page.next;
  } while (cursor !== undefined && out.length < max);
  return out;
}

// mcp-server rule 2: a search spends one budget of MAX_CANDIDATES titles per call, however many rounds that takes.
// Hidden people are dropped after the store returns them, so they cost rounds; they must not cut the page short.
for (const f of storeFactories) {
  describe.skipIf(f.skip !== undefined)(`${f.name}: search spends a candidate budget, not a round count`, () => {
    it("300 hidden people ahead of 5 readable documents: all 5 documents in at most 2 pages", { timeout: 120_000 }, async () => {
      const s = await f.open();
      await put(s, "u-me", "person", "me");
      await seed(
        Array.from({ length: 300 }, (_, i) => `p-${i}`),
        (id) => put(s, id, "person"),
      );
      for (let i = 0; i < 5; i++) {
        await put(s, `d-${i}`, "document");
        await s.addEdge({ tenant: T, from: "u-me", to: `d-${i}`, kind: "can-read", source: "test" }, 1);
      }
      const got = await pages(s, "u-me", 5, 10);
      const docs = got.flatMap((p) => p.nodes.map((n) => n.id)).filter((id) => id.startsWith("d-"));
      expect(docs).toEqual(["d-0", "d-1", "d-2", "d-3", "d-4"]);
      expect(got.length, `${got.length} pages`).toBeLessThanOrEqual(2);
    });

    it("a viewer who reads nothing over 10,000 titles: truncated, few store calls, 3 pages to the end", { timeout: 300_000 }, async () => {
      const real = await f.open();
      await put(real, "u-none", "person", "me");
      // Half documents (dropped by the store's edge rule) and half people (dropped here, after the store).
      await seed(
        Array.from({ length: 10_000 }, (_, i) => i),
        (i) => put(real, `n-${i}`, i % 2 ? "person" : "document"),
      );
      const { store, calls } = counted(real);
      const first: Page = await search(ctxFor(store, "u-none"), { query: "alpha", limit: 20 });
      expect(first).toMatchObject({ nodes: [], truncated: true });
      expect(calls.filter((c) => c === "scanTitles").length, calls.join(",")).toBeLessThanOrEqual(5);
      expect(calls.length, calls.join(",")).toBeLessThanOrEqual(12);
      // Each page spends the whole budget, so 10,000 titles take ceil(10,000 / 4,096) = 3 pages.
      const all = await pages(real, "u-none", 20, 50);
      expect(all.length).toBe(Math.ceil(10_000 / MAX_CANDIDATES));
      expect(all.flatMap((p) => p.nodes)).toEqual([]);
    });
  });
}
