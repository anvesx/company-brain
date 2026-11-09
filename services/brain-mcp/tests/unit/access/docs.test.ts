import { toAsync } from "@anvesx/graph-store";
import { afterAll, describe, expect, it } from "vitest";
import { viewer } from "../../../src/access/visible.js";
import { edge, node, T0, T1, tempStore } from "../../support/graph.js";

// docReader behind viewer(): both read paths (bulk and per-chunk) must agree, honour asOf, and only count documents.
const store = tempStore();
const view = toAsync(store);
const ORG = "org-d";
node(store, ORG, "u-dee", "person", "Dee");
node(store, ORG, "team-d", "team", "D team");
edge(store, ORG, "u-dee", "member-of", "team-d");
node(store, ORG, "doc-old", "document", "Old");
edge(store, ORG, "team-d", "can-read", "doc-old");
node(store, ORG, "doc-new", "document", "New", T1);
edge(store, ORG, "team-d", "can-read", "doc-new", T1);
node(store, ORG, "doc-edge", "document", "Node old, access granted later");
edge(store, ORG, "team-d", "can-read", "doc-edge", T1);
node(store, ORG, "chan-d", "channel", "Readable channel"); // can-read target that is not a document
edge(store, ORG, "team-d", "can-read", "chan-d");
node(store, ORG, "proj-c", "project", "Hangs on a channel");
edge(store, ORG, "chan-d", "belongs-to", "proj-c");
afterAll(() => store.close());

const who = { tenant: ORG, user: "u-dee" };

describe.each([false, true])("readable documents (bulk=%s)", (bulk) => {
  const see = async (ids: string[], asOf?: number) => (await viewer(view, who, asOf, bulk)).seesMany(ids.map((id) => ({ id })));

  it("sees readable documents and not a readable channel, nor a project hanging only on that channel", async () => {
    // A can-read target counts only when it is a document: the kind filter keeps the channel (and so proj-c) out.
    expect(await see(["doc-old", "doc-new", "chan-d", "proj-c"])).toEqual([true, true, false, false]);
  });

  it("with asOf, a can-read edge created later is not seen; without it, it is", async () => {
    expect(await see(["doc-old", "doc-new"], T0 + 100)).toEqual([true, false]);
    expect(await see(["doc-new"])).toEqual([true]);
  });

  it("with asOf, a document that already existed but became readable later is not seen", async () => {
    // The node exists at asOf, so only the can-read edge read can hide it: that read must carry asOf.
    expect(await see(["doc-edge"], T0 + 100)).toEqual([false]);
    expect(await see(["doc-edge"])).toEqual([true]);
  });
});
