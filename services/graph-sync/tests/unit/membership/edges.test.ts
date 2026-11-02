import type { Connector } from "@anvesx/connector-kit";
import { describe, expect, it } from "vitest";
import { type SyncError, syncConnector } from "../../../src/index.js";
import { setup } from "../../helpers.js";

const withMembers = (c: Connector, list: Connector["listMemberships"]): Connector => ({ ...c, ...(list === undefined ? {} : { listMemberships: list }) });

describe("membership sync details", () => {
  it("counts only the edges it adds, and ignores other edge kinds between the pair", async () => {
    const s = setup();
    const pairs = [{ group: "eng", user: "ana" }];
    const connector = withMembers(s.connector, async () => pairs);
    await syncConnector({ ...s.deps, connector });
    const mention = { tenant: "t1", from: "ana", to: "eng", kind: "mentions", source: "folder" } as const;
    s.store.addEdge(mention, s.now());
    s.store.removeEdge({ ...mention, kind: "member-of" }, s.now());
    const again = await syncConnector({ ...s.deps, connector });
    expect(again.edges).toBe(1);
    expect(s.store.neighbors("t1", "ana", { kind: "member-of", dir: "out" })).toHaveLength(1);
    expect((await syncConnector({ ...s.deps, connector })).edges).toBe(0);
  });

  it("names the pair it skips", async () => {
    const s = setup();
    const connector = withMembers(s.connector, async () => [{ group: "x", user: "x" }]);
    const report = await syncConnector({ ...s.deps, connector });
    expect(report.skipped).toEqual([{ address: "member-of x > x", message: "x is already a person, not a team" }]);
  });

  it("names the connector when the listing fails", async () => {
    const s = setup();
    const connector = withMembers(s.connector, () => Promise.reject(new Error("down")));
    const err = (await syncConnector({ ...s.deps, connector }).catch((e: unknown) => e)) as SyncError;
    expect([err.code, err.message]).toEqual(["CONNECTOR_FAILED", "connector folder failed listing memberships: Error: down"]);
  });

  it("stops when a newer run claimed the connector while memberships were listed", async () => {
    const s = setup();
    const rival = () => syncConnector(s.deps, { signal: AbortSignal.abort() }).catch(() => undefined);
    const connector = withMembers(s.connector, async () => (void rival(), [{ group: "eng", user: "ana" }]));
    const err = (await syncConnector({ ...s.deps, connector }).catch((e: unknown) => e)) as SyncError;
    expect(err.code).toBe("SUPERSEDED");
    expect(s.store.neighbors("t1", "ana", { kind: "member-of", dir: "out" })).toHaveLength(0);
  });
});
