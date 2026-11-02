import type { Connector } from "@brain/connector-kit";
import { describe, expect, it } from "vitest";
import { syncConnector } from "../../../src/index.js";
import { put, setup } from "../../helpers.js";

type Pair = { group: string; user: string };
const withMembers = (c: Connector, pairs: () => Promise<Pair[]>): Connector => ({ ...c, listMemberships: pairs });

describe("stale and failed membership runs", () => {
  it("closes edges of a team that left both the ACLs and the membership list", async () => {
    const { store, root, deps, connector } = setup();
    put(root, "a.txt", [], ["org/ops"]);
    let pairs = [{ group: "org/ops", user: "alice" }];
    const d = { ...deps, connector: withMembers(connector, async () => pairs) };
    await syncConnector(d);
    put(root, "a.txt", [], []);
    pairs = [];
    await syncConnector(d);
    expect(store.neighbors("t1", "alice", { kind: "member-of", dir: "out" })).toEqual([]);
  });

  it("aborts without closing anything when listing memberships throws", async () => {
    const { store, root, deps, connector } = setup();
    put(root, "a.txt", [], ["org/eng"]);
    let fail = false;
    const d = {
      ...deps,
      connector: withMembers(connector, async () => {
        if (fail) throw new Error("boom");
        return [{ group: "org/eng", user: "alice" }];
      }),
    };
    await syncConnector(d);
    fail = true;
    await expect(syncConnector(d)).rejects.toMatchObject({ code: "CONNECTOR_FAILED" });
    expect(store.neighbors("t1", "alice", { kind: "member-of", dir: "out" })).toHaveLength(1);
  });
});
