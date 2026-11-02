import { describe, expect, it } from "vitest";
import { syncConnector } from "../../../src/index.js";
import { doc, gated, listing } from "../../docs.js";
import { openStore, readers, ticker } from "../../helpers.js";
import { code } from "../../seed.js";

describe("overlapping runs", () => {
  it("a run that listed before a revocation cannot restore the revoked reader", async () => {
    const store = openStore();
    const now = ticker();
    const old = gated("E", [doc("d", ["mallory"])]);
    const first = syncConnector({ store, connector: old.connector, tenant: "t1", now });
    await syncConnector({ store, connector: listing("E", () => [doc("d", ["alice"])]), tenant: "t1", now });
    expect(readers(store, "t1", "E/d")).toEqual(["alice"]);
    old.open();
    expect(await code(first)).toBe("SUPERSEDED");
    expect(readers(store, "t1", "E/d")).toEqual(["alice"]);
  });

  it("a stale run does not tombstone what the newer run kept", async () => {
    const store = openStore();
    const now = ticker();
    await syncConnector({ store, connector: listing("E", () => [doc("d", ["a"])]), tenant: "t1", now });
    const old = gated("E", []);
    const first = syncConnector({ store, connector: old.connector, tenant: "t1", now });
    await syncConnector({ store, connector: listing("E", () => [doc("d", ["a"])]), tenant: "t1", now });
    old.open();
    expect(await code(first)).toBe("SUPERSEDED");
    expect(store.node("t1", "E/d")).toBeDefined();
  });

  it("other connectors and other tenants never supersede a run", async () => {
    const store = openStore();
    const now = ticker();
    const slow = gated("A", [doc("d", ["a"])]);
    const first = syncConnector({ store, connector: slow.connector, tenant: "t1", now });
    await syncConnector({ store, connector: listing("B", () => [doc("d", ["b"])]), tenant: "t1", now });
    await syncConnector({ store, connector: listing("A", () => [doc("d", ["z"])]), tenant: "t2", now });
    slow.open();
    await first;
    expect(readers(store, "t1", "A/d")).toEqual(["a"]);
  });

  it("a newer run after a finished one writes normally", async () => {
    const store = openStore();
    const now = ticker();
    await syncConnector({ store, connector: listing("A", () => [doc("d", ["a"])]), tenant: "t1", now });
    await syncConnector({ store, connector: listing("A", () => [doc("d", ["b"])]), tenant: "t1", now });
    expect(readers(store, "t1", "A/d")).toEqual(["b"]);
  });
});
