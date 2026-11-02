import { describe, expect, it } from "vitest";
import { syncConnector } from "../../src/index.js";
import { put, readers, setup } from "../helpers.js";

describe("scale", () => {
  it("syncs 5000 documents with 20 readers each in under 20 s, and re-syncs without writes", async () => {
    const s = setup();
    for (let i = 0; i < 5000; i++) {
      put(
        s.root,
        `d${Math.floor(i / 100)}/f${i}.txt`,
        Array.from({ length: 20 }, (_, k) => `user${(i + k) % 300}`),
      );
    }
    const t0 = Date.now();
    const r = await syncConnector(s.deps);
    const ms = Date.now() - t0;
    expect(ms).toBeLessThan(20_000);
    expect(r.pages).toBe(50);
    expect(readers(s.store, "t1", "folder/d3/f300.txt")).toHaveLength(20);
    const again = await syncConnector(s.deps);
    expect(again).toMatchObject({ nodes: 0, edges: 0, removed: 0 });
  }, 120_000);
});
