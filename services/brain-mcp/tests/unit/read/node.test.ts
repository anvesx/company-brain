import { toAsync } from "@anvesx/graph-store";
import { afterAll, describe, expect, it } from "vitest";
import { nodeView } from "../../../src/tools/read/node.js";
import { edge, node, T0, T1, tempStore } from "../../support/graph.js";

// brain.node over a real store file. Ada reads through team-eng; X is a readable document with edges both ways.
const store = tempStore();
const T = "org-n";
const ctx = { store: toAsync(store), caller: { tenant: T, user: "u-ada" }, accounts: async () => [] };
const peers = async (id: string, asOf?: number) => (await nodeView(ctx, id, asOf)).neighbours.map((e) => `${e.from}>${e.kind}>${e.to}`).sort();
afterAll(() => store.close());

node(store, T, "u-ada", "person", "Ada");
node(store, T, "team-eng", "team", "Engineering");
edge(store, T, "u-ada", "member-of", "team-eng");
const readable = (id: string, at = T0) => {
  node(store, T, id, "document", id, at);
  edge(store, T, "team-eng", "can-read", id, at);
};
for (const id of ["X", "doc-out", "doc-in", "doc-late"]) readable(id, id === "doc-late" ? T1 : T0);
node(store, T, "doc-hid", "document", "hidden");
edge(store, T, "X", "links-to", "doc-out"); // out-edge: far end is e.to
edge(store, T, "doc-in", "links-to", "X"); // in-edge: far end is e.from
edge(store, T, "X", "links-to", "doc-hid"); // out-edge to a hidden node
edge(store, T, "doc-hid", "links-to", "X"); // in-edge from a hidden node
edge(store, T, "X", "links-to", "doc-late", T1); // added after T0
edge(store, T, "X", "mentions", "doc-out", T1); // far end already visible at T0, only the edge is new

describe("brain.node", () => {
  it("fails NOT_FOUND with `no node <id>` for a hidden node and for a missing one alike", async () => {
    for (const id of ["doc-hid", "nope"]) await expect(nodeView(ctx, id)).rejects.toMatchObject({ code: "NOT_FOUND", message: `no node ${id}` });
  });

  it("keeps an edge only when its far end is visible, whichever way the edge points", async () => {
    // X -> doc-hid and doc-hid -> X are dropped; judging the near end (X, visible) instead would let both through.
    expect(await peers("X")).toEqual(["X>links-to>doc-late", "X>links-to>doc-out", "X>mentions>doc-out", "doc-in>links-to>X", "team-eng>can-read>X"]);
  });

  it("reads edges as they were at asOf, and as they are now without it", async () => {
    expect(await peers("X", T0 + 100)).toEqual(["X>links-to>doc-out", "doc-in>links-to>X", "team-eng>can-read>X"]); // later edges do not exist yet
    expect(await peers("X")).toContain("X>mentions>doc-out");
  });

  it("omits `truncated` by default", async () => {
    expect(await nodeView(ctx, "X")).not.toHaveProperty("truncated");
  });
});

describe("brain.node neighbour cap", () => {
  const hub = (id: string, docs: number) => {
    readable(id);
    for (let i = 0; i < docs; i++) {
      readable(`${id}-n${i}`);
      edge(store, T, id, "links-to", `${id}-n${i}`);
    }
  };
  it("returns 500 neighbours untruncated: 499 documents plus the team's can-read edge", async () => {
    hub("hub-500", 499);
    const r = await nodeView(ctx, "hub-500");
    expect(r.neighbours).toHaveLength(500);
    expect(r).not.toHaveProperty("truncated"); // exactly at the cap is not over it
  });

  it("cuts at 500 and says truncated when one more visible neighbour exists", async () => {
    hub("hub-501", 500);
    const r = await nodeView(ctx, "hub-501");
    expect(r.neighbours).toHaveLength(500);
    expect(r.truncated).toBe(true);
  });
});
