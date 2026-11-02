import { join } from "node:path";
import type { Connector } from "@anvesx/connector-kit";
import type { GraphStore } from "@anvesx/graph-store";
import { describe, expect, it } from "vitest";
import { reindex } from "../../../src/reindex.js";
import { openRank, tmp } from "../../support/world.js";

const N = 10_001;
const nodes = new Map(
  Array.from({ length: N }, (_, i) => [
    `d${i}`,
    { id: `d${i}`, title: `t${i}`, address: `/p/${i}`, version: "v1", props: { updatedAt: "2026-01-01T00:00:00Z" } },
  ]),
);
const store = {
  neighbors: (_t: string, _id: string, q: { kind: string }) => (q.kind === "belongs-to" ? [...nodes.keys()].map((from) => ({ from })) : [{ from: "u" }]),
  node: (_t: string, id: string) => nodes.get(id),
} as unknown as GraphStore;
const connector = { id: "c", fetch: async () => ({ text: "hello world" }) } as unknown as Connector;

describe("reindex of a corpus above the rank batch cap", () => {
  it("indexes all of 10,001 documents and remembers each", async () => {
    const index = openRank(join(tmp(), "big.sqlite"));
    const known = new Map<string, string>();
    const diff = await reindex({ store, connector, tenant: "t", index, known });
    expect(diff.created).toHaveLength(N);
    expect(known.size).toBe(N);
    expect(index.search({ query: "hello", asker: { principals: ["u"] }, k: 100 })).toHaveLength(100);
    expect((await reindex({ store, connector, tenant: "t", index, known })).created).toEqual([]);
    index.close();
  });
});
