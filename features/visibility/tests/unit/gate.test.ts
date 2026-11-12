import { describe, expect, it } from "vitest";
import { openGate, type Recheck } from "../../src/gate.js";
import { sqlStore } from "../support/sql-store.js";

const yes: Recheck = async () => true;
const doc = { zone: "company", owner: "ann" };

/** Ann owns d1 and d2; Ben (member of team eng) reads d1 through his email and d3 through the team. */
function world() {
  const w = sqlStore();
  for (const [id, kind] of [
    ["ann", "person"],
    ["ben", "person"],
    ["eng", "team"],
  ] as const)
    w.node(id, kind);
  for (const id of ["d1", "d2", "d3"]) w.node(id, "document", doc);
  w.node("p1", "document", { zone: "personal", owner: "ann" });
  w.node("f1", "document", {});
  w.node("r1", "repo");
  for (const [from, to] of [
    ["ann", "d1"],
    ["ann", "d2"],
    ["ann", "p1"],
    ["ben@x.test", "d1"],
    ["eng", "d3"],
    ["ben", "f1"],
    ["ben", "p1"],
    ["ben", "r1"],
  ] as const)
    w.edge(from, to, "can-read");
  w.edge("ben", "eng", "member-of");
  return w;
}
const ben = { tenant: "t", user: "ben", aliases: ["ben@x.test"] };
const ids = async (g: ReturnType<typeof openGate>, list?: string[]) => [...(await g.approve(list)).keys()].sort();

describe("gate", () => {
  it("lists what a viewer reads by id, alias and team, and nothing else", async () => {
    expect(await ids(openGate(world().store, ben, { recheck: yes }))).toEqual(["d1", "d3"]);
  });
  it("hides a document with no zone, another person's personal zone and a non-document", async () => {
    expect(await ids(openGate(world().store, ben, { recheck: yes }), ["f1", "p1", "r1", "gone"])).toEqual([]);
  });
  it("hides everything without a live check, and when the check says no", async () => {
    expect(await ids(openGate(world().store, ben))).toEqual([]);
    expect(await ids(openGate(world().store, ben, { recheck: async (d) => d.id !== "d1" }))).toEqual(["d3"]);
  });
  it("gives readers to the owner only, and reports the viewer's principals once", async () => {
    const w = world();
    const owner = openGate(w.store, { tenant: "t", user: "ann" }, { recheck: yes });
    expect((await owner.approve(["d1"])).get("d1")?.readers).toEqual(["ann", "ben@x.test"]);
    const reader = openGate(w.store, ben, { recheck: yes });
    expect((await reader.approve(["d1"])).get("d1")?.readers).toBeUndefined();
    expect(await reader.principals()).toEqual(["ben", "ben@x.test", "eng"]);
  });
  it("judges ids in chunks of 2000 and answers a repeat from memory", async () => {
    const w = world();
    const g = openGate(w.store, ben, { recheck: yes });
    expect(
      await ids(
        g,
        Array.from({ length: 2_001 }, (_, i) => (i === 0 ? "d1" : `x${i}`)),
      ),
    ).toEqual(["d1"]);
    expect(await ids(g, ["d1"])).toEqual(["d1"]);
  });
});
