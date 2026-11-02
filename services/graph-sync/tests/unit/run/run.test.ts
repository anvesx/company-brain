import { describe, expect, it } from "vitest";
import { type SyncError, syncConnector } from "../../../src/index.js";
import { doc, listing } from "../../docs.js";
import { setup } from "../../helpers.js";

const fail = (p: Promise<unknown>) =>
  p.then(
    () => undefined,
    (e: unknown) => e as SyncError,
  );

describe("run errors carry their reason", () => {
  it("rejects bad options with a message", async () => {
    const s = setup();
    await expect(syncConnector(s.deps, { pageSize: 0 })).rejects.toThrow("pageSize must be an integer from 1 to 1000");
    await expect(syncConnector({ ...s.deps, connector: listing("a/b", () => []) })).rejects.toThrow("connector id must not contain a slash");
  });

  it("aborts before listing when the signal is already aborted", async () => {
    const s = setup();
    const err = await fail(syncConnector(s.deps, { signal: AbortSignal.abort() }));
    expect([err?.code, err?.message]).toEqual(["ABORTED", "sync aborted"]);
  });

  it("names the connector and keeps the cause when listing fails", async () => {
    const s = setup();
    const cause = new Error("boom");
    const err = await fail(syncConnector({ ...s.deps, connector: listing("folder", () => [], { list: async () => Promise.reject(cause) }) }));
    expect(err?.message).toBe("connector folder failed: Error: boom");
    expect(err?.cause).toBe(cause);
  });

  it("passes the cursor only after the first page, and stops on a stuck cursor", async () => {
    const s = setup();
    const calls: unknown[] = [];
    const list = async (q: { cursor?: string; limit: number }) => {
      calls.push(q);
      return { items: [], nextCursor: "c1" };
    };
    const err = await fail(syncConnector({ ...s.deps, connector: listing("folder", () => [], { list }) }, { pageSize: 2 }));
    expect(calls).toStrictEqual([{ limit: 2 }, { cursor: "c1", limit: 2 }]);
    expect(err?.message).toBe("connector cursor did not advance");
  });

  it("reports two addresses on one node by name", async () => {
    const s = setup();
    const report = await syncConnector({ ...s.deps, connector: listing("folder", () => [doc("a"), doc("folder/a")]) });
    expect(report.skipped).toEqual([{ address: "folder/a", message: "folder/a is already the node of address a" }]);
  });
});
