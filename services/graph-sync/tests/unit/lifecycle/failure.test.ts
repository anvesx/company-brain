import type { Connector } from "@anvesx/connector-kit";
import { describe, expect, it } from "vitest";
import { SyncError, syncConnector } from "../../../src/index.js";
import { setup } from "../../helpers.js";
import { code, seed } from "../../seed.js";

describe("failures", () => {
  it("turns a connector throw mid-page into CONNECTOR_FAILED, keeps pages, then converges", async () => {
    const s = setup();
    seed(s, 5);
    const cause = new Error("source down");
    let fail = true;
    const flaky: Connector = {
      ...s.connector,
      list: async (q) => {
        if (q.cursor !== undefined && fail) throw cause;
        return s.connector.list(q);
      },
    };
    const err = await syncConnector({ ...s.deps, connector: flaky }, { pageSize: 2 }).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(SyncError);
    expect((err as SyncError).code).toBe("CONNECTOR_FAILED");
    expect((err as SyncError).cause).toBe(cause);
    expect(s.store.node("t1", "folder/d0.txt")).toBeDefined();
    expect(s.store.node("t1", "folder/d4.txt")).toBeUndefined();
    fail = false;
    await syncConnector({ ...s.deps, connector: flaky }, { pageSize: 2 });
    expect(s.store.node("t1", "folder/d4.txt")).toBeDefined();
  });

  it("does not tombstone after a failed run", async () => {
    const s = setup();
    seed(s, 3);
    await syncConnector(s.deps);
    const down: Connector = {
      ...s.connector,
      list: async () => {
        throw new Error("x");
      },
    };
    expect(await code(syncConnector({ ...s.deps, connector: down }))).toBe("CONNECTOR_FAILED");
    expect(s.store.node("t1", "folder/d2.txt")).toBeDefined();
  });

  it("throws ABORTED between pages and keeps what was written", async () => {
    const s = setup();
    seed(s, 5);
    const ctl = new AbortController();
    const abortAfterFirst: Connector = {
      ...s.connector,
      list: async (q) => {
        const page = await s.connector.list(q);
        ctl.abort();
        return page;
      },
    };
    expect(await code(syncConnector({ ...s.deps, connector: abortAfterFirst }, { pageSize: 2, signal: ctl.signal }))).toBe("ABORTED");
    expect(s.store.node("t1", "folder/d1.txt")).toBeDefined();
    expect(s.store.node("t1", "folder/d2.txt")).toBeUndefined();
  });

  it("throws ABORTED at once when already aborted", async () => {
    const s = setup();
    seed(s, 1);
    expect(await code(syncConnector(s.deps, { signal: AbortSignal.abort() }))).toBe("ABORTED");
    expect(s.store.node("t1", "folder/d0.txt")).toBeUndefined();
  });
});
