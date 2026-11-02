import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { createGraphStore } from "../../src/index.js";
import { edge, node, tmpDir } from "../support/helpers.js";

describe("real SQLite file", () => {
  it("persists nodes, edges, history and tombstones across reopen", () => {
    const path = join(tmpDir(), "g.db");
    const a = createGraphStore({ path });
    a.upsertNode(node("a", { title: "old", props: { k: "v" } }), 1);
    a.upsertNode(node("a", { title: "new", props: { k: "v" } }), 2);
    a.addEdge(edge("a", "b"), 1);
    a.addEdge(edge("a", "c"), 1);
    a.removeEdge(edge("a", "c"), 3);
    a.upsertNode(node("gone"), 1);
    a.tombstone("t1", "gone", 4);
    a.close();

    const b = createGraphStore({ path });
    expect(b.node("t1", "a")?.title).toBe("new");
    expect(b.node("t1", "a", 1)?.title).toBe("old");
    expect(b.node("t1", "a")?.props).toEqual({ k: "v" });
    expect(b.history("t1", "a")).toHaveLength(2);
    expect(b.neighbors("t1", "a").map((e) => e.to)).toEqual(["b"]);
    expect(b.neighbors("t1", "a", { asOf: 2 })).toHaveLength(2);
    expect(b.node("t1", "gone")).toBeUndefined();
    b.close();
  });

  it("removes the wal and shm files on close", () => {
    const path = join(tmpDir(), "g.db");
    const s = createGraphStore({ path });
    s.upsertNode(node("a"), 1);
    expect(existsSync(`${path}-wal`)).toBe(true);
    s.close();
    expect(existsSync(path)).toBe(true);
    expect(existsSync(`${path}-wal`)).toBe(false);
    expect(existsSync(`${path}-shm`)).toBe(false);
  });

  it("two handles in one process see each other's writes", () => {
    const path = join(tmpDir(), "g.db");
    const a = createGraphStore({ path });
    const b = createGraphStore({ path });
    a.upsertNode(node("a"), 1);
    expect(b.node("t1", "a")?.id).toBe("a");
    a.close();
    b.close();
  });
});
