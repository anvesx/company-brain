import { createFolderConnector } from "@anvesx/connector-kit";
import { syncConnector } from "@anvesx/graph-sync";
import { describe, expect, it } from "vitest";
import { reindex } from "../../../src/reindex.js";
import { deps, put, stack } from "../../support/world.js";

/** A connector like Drive: its version ignores the ACL, so a permission change leaves it as it was. */
const blind = (root: string) => {
  const real = createFolderConnector("docs", root);
  return {
    ...real,
    list: async (q: { cursor?: string; limit: number }) => {
      const page = await real.list(q);
      return { ...page, items: page.items.map((i) => ({ ...i, version: "v1" })) };
    },
    fetch: async (a: string, c: { token: string }) => ({ text: (await real.fetch(a, c)).text, version: "v1" }),
  };
};
const bob = (s: ReturnType<typeof stack>) => s.ix.search({ query: "handbook", asker: { principals: ["user:bob"] } });

describe("reindex when only the ACL changed", () => {
  it("drops a revoked reader although the version did not move", async () => {
    const s = stack();
    const d = { ...deps(s.store, s.root), connector: blind(s.root) };
    const pass = async () => {
      await syncConnector(d);
      await reindex({ ...d, index: s.ix, known: s.known });
    };
    put(s.root, "n.md", "handbook", ["ana", "bob"]);
    await pass();
    expect(bob(s)).toHaveLength(1);

    put(s.root, "n.md", "handbook", ["ana"]);
    await pass();
    expect(bob(s)).toEqual([]);
  });
});
