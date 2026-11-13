import { describe, expect, it } from "vitest";
import { visibleGraph } from "../../../src/index.js";
import { ALLOW, edge, KEY, LIMITS, node, openStore, write } from "../../support/store.js";

const q = { cursorKey: KEY, tenant: "t1", user: "u" };
const world = (docProps: Record<string, string>) => {
  const store = openStore();
  write(
    store,
    1,
    [node("t1", "u", "person", "slack"), node("t1", "v", "person", "slack"), node("t1", "d", "document", "gdrive", { props: docProps })],
    [edge("t1", "u", "d", "can-read"), edge("t1", "v", "d", "can-read")],
  );
  return store;
};
const ids = async (store: ReturnType<typeof world>, over: object) => (await visibleGraph(store, { ...q, ...over })).nodes.map((n) => n.id);

describe("permission gate leaks on the graph view", () => {
  it("no live check wired: every document is hidden (fail closed)", async () => {
    expect(await ids(world({ zone: "company" }), {})).toEqual(["u"]);
  });
  it("a live check that says no, throws or is slow hides the document", async () => {
    const no = async () => false;
    const boom = async (): Promise<boolean> => {
      throw new Error("source down");
    };
    expect(await ids(world({ zone: "company" }), { recheck: no, recheckLimits: LIMITS })).toEqual(["u"]);
    expect(await ids(world({ zone: "company" }), { recheck: boom, recheckLimits: LIMITS })).toEqual(["u"]);
  });
  it("a document with no zone, or in someone else's personal zone, is hidden", async () => {
    expect(await ids(world({}), { recheck: ALLOW, recheckLimits: LIMITS })).toEqual(["u"]);
    expect(await ids(world({ zone: "personal", owner: "v" }), { recheck: ALLOW, recheckLimits: LIMITS })).toEqual(["u"]);
  });
  it("co-readers are shown only to the document's owner (leak 4)", async () => {
    const mine = await ids(world({ zone: "personal", owner: "u" }), { recheck: ALLOW, recheckLimits: LIMITS });
    expect(mine).toEqual(["d", "u", "v"]);
    expect(await ids(world({ zone: "company" }), { recheck: ALLOW, recheckLimits: LIMITS })).toEqual(["d", "u"]);
  });
  it("time travel uses current permissions: a grant removed later is not drawn at an older asOf (leak 5)", async () => {
    const store = world({ zone: "company" });
    store.removeEdge(edge("t1", "u", "d", "can-read"), 5_000);
    expect(await ids(store, { recheck: ALLOW, recheckLimits: LIMITS, asOf: 2_000 })).toEqual(["u"]);
  });
});
