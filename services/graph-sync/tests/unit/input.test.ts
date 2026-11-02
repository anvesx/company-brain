import type { Connector } from "@anvesx/connector-kit";
import { describe, expect, it } from "vitest";
import { syncConnector } from "../../src/index.js";
import { put, readers, setup } from "../helpers.js";
import { code, seed } from "../seed.js";

describe("input", () => {
  it("pages with the requested size and defaults to 100", async () => {
    const s = setup();
    seed(s, 5);
    const limits: number[] = [];
    const spy: Connector = {
      ...s.connector,
      list: (q) => {
        limits.push(q.limit);
        return s.connector.list(q);
      },
    };
    expect((await syncConnector({ ...s.deps, connector: spy }, { pageSize: 2 })).pages).toBe(3);
    await syncConnector({ ...s.deps, connector: spy });
    expect(limits).toEqual([2, 2, 2, 100]);
  });

  it("accepts page sizes 1 and 1000, rejects the rest with BAD_INPUT", async () => {
    const s = setup();
    seed(s, 2);
    expect((await syncConnector(s.deps, { pageSize: 1 })).pages).toBe(2);
    expect((await syncConnector(s.deps, { pageSize: 1000 })).pages).toBe(1);
    for (const pageSize of [0, -1, 1001, 1.5, Number.NaN]) {
      expect(await code(syncConnector(s.deps, { pageSize }))).toBe("BAD_INPUT");
    }
  });

  it("rejects an empty tenant with BAD_INPUT", async () => {
    const s = setup();
    seed(s, 1);
    expect(await code(syncConnector({ ...s.deps, tenant: "" }))).toBe("BAD_INPUT");
  });

  it("last duplicate address wins and the ACL converges", async () => {
    const s = setup();
    put(s.root, "a.txt", ["ana"]);
    const base = await s.connector.list({ limit: 10 });
    const doc = base.items[0]!;
    const twice: Connector = {
      ...s.connector,
      list: async () => ({ items: [doc, { ...doc, acl: { ...doc.acl, allowUsers: ["bo"] } }] }),
    };
    const r = await syncConnector({ ...s.deps, connector: twice });
    expect(readers(s.store, "t1", "folder/a.txt")).toEqual(["bo"]);
    expect(r.removed).toBe(0);
  });

  it("stops on a cursor that never advances", async () => {
    const s = setup();
    const stuck: Connector = { ...s.connector, list: async () => ({ items: [], nextCursor: "1" }) };
    expect(await code(syncConnector({ ...s.deps, connector: stuck }))).toBe("CONNECTOR_FAILED");
  });
});
