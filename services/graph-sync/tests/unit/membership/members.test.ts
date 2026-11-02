import type { Connector } from "@brain/connector-kit";
import type { GraphStore } from "@brain/graph-store";
import { describe, expect, it } from "vitest";
import { syncConnector } from "../../../src/index.js";
import { put, setup } from "../../helpers.js";

type Pair = { group: string; user: string };

const withMembers = (c: Connector, pairs: () => Pair[]): Connector => ({ ...c, listMemberships: async () => pairs() });

const teamsOf = (store: GraphStore, user: string): string[] =>
  store
    .neighbors("t1", user, { kind: "member-of", dir: "out" })
    .map((e) => e.to)
    .sort();

describe("group membership to member-of edges", () => {
  it("links each user to their groups", async () => {
    const { store, root, deps, connector } = setup();
    put(root, "a.txt", [], ["org/eng"]);
    const pairs = [
      { group: "org/eng", user: "alice" },
      { group: "org/eng", user: "bo" },
      { group: "org/ops", user: "alice" },
    ];
    await syncConnector({ ...deps, connector: withMembers(connector, () => pairs) });
    expect(teamsOf(store, "alice")).toEqual(["org/eng", "org/ops"]);
    expect(teamsOf(store, "bo")).toEqual(["org/eng"]);
    expect(store.node("t1", "alice")?.kind).toBe("person");
    expect(store.node("t1", "org/ops")?.kind).toBe("team");
  });

  it("closes the edge when a member leaves and keeps it when they stay", async () => {
    const { store, root, deps, connector } = setup();
    put(root, "a.txt", [], ["org/eng"]);
    let pairs = [
      { group: "org/eng", user: "alice" },
      { group: "org/eng", user: "bo" },
    ];
    const d = { ...deps, connector: withMembers(connector, () => pairs) };
    await syncConnector(d);
    pairs = [{ group: "org/eng", user: "bo" }];
    await syncConnector(d);
    expect(teamsOf(store, "alice")).toEqual([]);
    expect(teamsOf(store, "bo")).toEqual(["org/eng"]);
  });

  it("is idempotent on re-run", async () => {
    const { root, deps, connector } = setup();
    put(root, "a.txt");
    const d = { ...deps, connector: withMembers(connector, () => [{ group: "org/eng", user: "alice" }]) };
    await syncConnector(d);
    const again = await syncConnector(d);
    expect(again.edges).toBe(0);
  });

  it("does nothing when the connector has no memberships", async () => {
    const { store, root, deps } = setup();
    put(root, "a.txt", ["ana"]);
    await syncConnector(deps);
    expect(teamsOf(store, "ana")).toEqual([]);
  });

  it("does not touch member-of edges that came from another source", async () => {
    const { store, root, deps, connector } = setup();
    put(root, "a.txt");
    store.addEdge({ tenant: "t1", from: "alice", to: "org/eng", kind: "member-of", source: "other" }, 1);
    await syncConnector({ ...deps, connector: withMembers(connector, () => []) });
    expect(teamsOf(store, "alice")).toEqual(["org/eng"]);
  });
});
