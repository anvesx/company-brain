import { describe, expect, it } from "vitest";
import { syncConnector } from "../../src/index.js";
import { put, readers, setup } from "../helpers.js";

describe("acl to edges", () => {
  it("makes person and team nodes with can-read edges", async () => {
    const { store, root, deps } = setup();
    put(root, "a.txt", ["ana", "bo"], ["eng"]);
    const r = await syncConnector(deps);
    expect(readers(store, "t1", "folder/a.txt")).toEqual(["ana", "bo", "eng"]);
    expect(store.node("t1", "ana")?.kind).toBe("person");
    expect(store.node("t1", "eng")?.kind).toBe("team");
    expect(r).toEqual({ nodes: 5, edges: 4, removed: 0, pages: 1, skipped: [] });
  });

  it("writes a document node with metadata and no text key", async () => {
    const { store, root, deps } = setup();
    put(root, "dir/a.txt", ["ana"]);
    await syncConnector(deps);
    const n = store.node("t1", "folder/dir/a.txt");
    expect(n).toMatchObject({ kind: "document", source: "folder", address: "dir/a.txt", title: "a.txt" });
    expect(n?.version).not.toBe("");
    expect(Object.keys(n?.props ?? {}).sort()).toEqual(["updatedAt", "zone"]);
    expect(n?.props["zone"]).toBe("personal");
    expect(JSON.stringify(n)).not.toContain("text of");
  });

  it("links each document to its connector node", async () => {
    const { store, root, deps } = setup();
    put(root, "a.txt");
    await syncConnector(deps);
    const out = store.neighbors("t1", "folder/a.txt", { kind: "belongs-to", dir: "out" });
    expect(out).toHaveLength(1);
    expect(out[0]?.source).toBe("folder");
  });

  it("passes ids through resolve with the right kind", async () => {
    const { store, root, deps } = setup();
    put(root, "a.txt", ["Ana@X.com"], ["Eng Team"]);
    const seen: string[] = [];
    const resolve = (kind: "person" | "team", raw: string): string => {
      seen.push(`${kind}:${raw}`);
      return `${kind}/${raw.toLowerCase()}`;
    };
    await syncConnector({ ...deps, resolve });
    expect(readers(store, "t1", "folder/a.txt")).toEqual(["person/ana@x.com", "team/eng team"]);
    expect(seen.sort()).toEqual(["person:Ana@X.com", "team:Eng Team"]);
  });

  it("collapses users that resolve to the same id", async () => {
    const { store, root, deps } = setup();
    put(root, "a.txt", ["ANA", "ana"]);
    const r = await syncConnector({ ...deps, resolve: (_k, raw) => raw.toLowerCase() });
    expect(readers(store, "t1", "folder/a.txt")).toEqual(["ana"]);
    expect(r.edges).toBe(2);
  });

  it("keeps unicode addresses and principals", async () => {
    const { store, root, deps } = setup();
    put(root, "日本/資料 é.txt", ["山田", "zoë"], ["équipe"]);
    await syncConnector(deps);
    expect(readers(store, "t1", "folder/日本/資料 é.txt")).toEqual(["zoë", "équipe", "山田"].sort());
    expect(store.node("t1", "folder/日本/資料 é.txt")?.title).toBe("資料 é.txt");
  });

  it("handles an ACL with thousands of readers", async () => {
    const { store, root, deps } = setup();
    put(
      root,
      "big.txt",
      Array.from({ length: 3000 }, (_, i) => `u${i}`),
    );
    const r = await syncConnector(deps);
    expect(readers(store, "t1", "folder/big.txt")).toHaveLength(3000);
    expect(r.edges).toBe(3001);
    expect(await syncConnector(deps)).toMatchObject({ nodes: 0, edges: 0 });
  });
});
