import { GraphError } from "@anvesx/graph-store";
import { describe, expect, it } from "vitest";
import { SyncError, syncConnector } from "../../../src/index.js";
import { doc, listing } from "../../docs.js";
import { setup } from "../../helpers.js";

const fail = (p: Promise<unknown>) =>
  p.then(
    () => undefined,
    (e: unknown) => e as SyncError,
  );

describe("run error kinds", () => {
  it("lets a store failure through as the store's own error", async () => {
    const s = setup();
    s.store.close();
    const err = await syncConnector(s.deps).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(GraphError);
    expect(err).not.toBeInstanceOf(SyncError);
  });

  it("wraps bad store input once and does not wrap a SyncError", async () => {
    const empty = setup("");
    const wrapped = await fail(syncConnector(empty.deps));
    expect([wrapped?.code, wrapped?.cause instanceof GraphError]).toEqual(["BAD_INPUT", true]);
    const s = setup();
    s.store.upsertNode({ tenant: "t1", id: "connector:folder", kind: "team", source: "folder", address: "x", title: "x", version: "1", props: {} }, 1);
    const clash = await fail(syncConnector(s.deps));
    expect([clash?.code, "cause" in (clash ?? {})]).toEqual(["BAD_INPUT", false]);
  });

  it("builds SyncError with a name and an optional cause", () => {
    const cause = new Error("c");
    expect(new SyncError("ABORTED", "m", cause).cause).toBe(cause);
    const bare = new SyncError("ABORTED", "m");
    expect(["cause" in bare, bare.name]).toEqual([false, "SyncError"]);
  });

  it("says which connector was superseded", async () => {
    const s = setup();
    const slow = listing("folder", () => [], { list: async () => ({ items: [] }) });
    const first = fail(syncConnector({ ...s.deps, connector: slow }));
    await syncConnector({ ...s.deps, connector: slow });
    expect((await first)?.message).toBe("sync of folder was superseded by a newer run");
  });
});

describe("deleting", () => {
  it("is not reached by a run superseded during its last page, and only takes documents", async () => {
    const s = setup();
    const node = (id: string) => ({ tenant: "t1", id, kind: "document" as const, source: "folder", address: id, title: id, version: "1", props: {} });
    for (const id of ["old", "other"]) s.store.upsertNode(node(id), 1);
    const edge = (from: string, kind: "belongs-to" | "links-to") => ({ tenant: "t1", from, to: "connector:folder", kind, source: "folder" }) as const;
    s.store.addEdge(edge("old", "belongs-to"), 1);
    s.store.addEdge(edge("other", "links-to"), 1);
    const rival = () => syncConnector(s.deps, { signal: AbortSignal.abort() }).catch(() => undefined);
    const item = doc("new");
    Object.defineProperty(item, "acl", {
      get: () => {
        void rival();
        return { allowUsers: [], allowGroups: [], version: 1 };
      },
    });
    const err = await fail(syncConnector({ ...s.deps, connector: listing("folder", () => [item]) }));
    expect(err?.code).toBe("SUPERSEDED");
    expect(s.store.node("t1", "old")).toBeDefined();
    const done = await syncConnector(s.deps);
    expect([done.removed, s.store.node("t1", "old"), s.store.node("t1", "other") === undefined]).toEqual([2, undefined, false]);
  });
});
