import { toAsync } from "@anvesx/graph-store";
import { afterAll, describe, expect, it } from "vitest";
import { graph } from "../../../src/tools/read/graph.js";
import { edge, node, tempStore } from "../../support/graph.js";

// brain.graph over a real store file. Ada acts as u-ada and team-eng; ids are chosen so insertion order is not id order.
const store = tempStore();
const T = "org-g";
const ctx = { store: toAsync(store), caller: { tenant: T, user: "u-ada" }, accounts: async () => [] };
afterAll(() => store.close());

node(store, T, "u-ada", "person", "Ada");
node(store, T, "team-eng", "team", "Engineering");
edge(store, T, "u-ada", "member-of", "team-eng");
node(store, T, "doc-own", "document", "Ada's own");
edge(store, T, "u-ada", "can-read", "doc-own"); // can-read out of a principal: doc-own
node(store, T, "doc-plan", "document", "Plan");
edge(store, T, "team-eng", "can-read", "doc-plan");
node(store, T, "proj-x", "project", "X");
edge(store, T, "doc-plan", "belongs-to", "proj-x"); // belongs-to out of a readable doc: proj-x
node(store, T, "u-rdr", "person", "Reader");
edge(store, T, "u-rdr", "can-read", "doc-plan"); // can-read into a readable doc: u-rdr
node(store, T, "chan-x", "channel", "Chat");
edge(store, T, "team-eng", "can-read", "chan-x"); // walked to, but a channel is never visible
node(store, T, "doc-hid", "document", "Hidden");
edge(store, T, "doc-plan", "links-to", "doc-hid"); // out-edge to a node Ada cannot see
const ALL = ["doc-own", "doc-plan", "proj-x", "team-eng", "u-ada", "u-rdr"];

describe("brain.graph", () => {
  it("lists exactly the visible ids, sorted: one per edge kind walked, no channel, no hidden doc", async () => {
    const r = await graph(ctx, { limit: 100 });
    expect(r.nodes.map((n) => n.id)).toEqual(ALL); // strictly ascending, no duplicates
    expect(r).not.toHaveProperty("next"); // everything fit on one page
  });

  it("returns each visible node's out-edges once, and never an edge to a hidden node", async () => {
    const r = await graph(ctx, { limit: 100 });
    const shown = r.edges.map((e) => `${e.from}>${e.kind}>${e.to}`).sort();
    // doc-plan -links-to-> doc-hid is dropped; in-edges are not repeated under the far end; team-eng -> chan-x is dropped.
    expect(shown).toEqual([
      "doc-plan>belongs-to>proj-x",
      "team-eng>can-read>doc-plan",
      "u-ada>can-read>doc-own",
      "u-ada>member-of>team-eng",
      "u-rdr>can-read>doc-plan",
    ]);
  });

  it("counts nodes per group, one each", async () => {
    // group = kind:source; documents come from drive, the rest from directory.
    expect((await graph(ctx, { limit: 100 })).categories).toEqual({ "document:drive": 2, "project:directory": 1, "team:directory": 1, "person:directory": 2 });
  });

  it("pages by cursor and sets next only while ids remain after the page", async () => {
    const p1 = await graph(ctx, { limit: 4 });
    expect(p1.nodes.map((n) => n.id)).toEqual(ALL.slice(0, 4));
    expect(p1.next).toBe("team-eng"); // the last id of this page
    const p2 = await graph(ctx, { limit: 4, cursor: p1.next });
    expect(p2.nodes.map((n) => n.id)).toEqual(["u-ada", "u-rdr"]);
    expect(p2).not.toHaveProperty("next"); // a short last page has no next
  });

  it("gives no next when the page is exactly full and nothing follows", async () => {
    const r = await graph(ctx, { limit: ALL.length });
    expect(r.nodes).toHaveLength(ALL.length);
    expect(r).not.toHaveProperty("next");
    expect((await graph(ctx, { limit: 2, cursor: "team-eng" })).nodes.map((n) => n.id)).toEqual(["u-ada", "u-rdr"]);
  });
});
