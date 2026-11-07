import { toAsync } from "@anvesx/graph-store";
import { afterAll, describe, expect, it } from "vitest";
import { viewer } from "../../../src/access/visible.js";
import { edge, node, tempStore } from "../../support/graph.js";

// Which node kinds become visible through a readable document, and how seesMany treats kind hints and ghosts.
const store = tempStore();
const view = toAsync(store);
const ORG = "org-k";
node(store, ORG, "u-kim", "person", "Kim");
node(store, ORG, "team-k", "team", "K team");
edge(store, ORG, "u-kim", "member-of", "team-k");
node(store, ORG, "doc-ok", "document", "Readable");
edge(store, ORG, "team-k", "can-read", "doc-ok");
node(store, ORG, "doc-no", "document", "Unreadable");
for (const [id, kind] of [
  ["repo-a", "repo"],
  ["proj-a", "project"],
  ["repo-x", "repo"],
  ["proj-x", "project"],
] as const)
  node(store, ORG, id, kind, id);
edge(store, ORG, "doc-ok", "belongs-to", "repo-a");
edge(store, ORG, "doc-ok", "belongs-to", "proj-a");
edge(store, ORG, "doc-no", "belongs-to", "repo-x");
edge(store, ORG, "doc-no", "belongs-to", "proj-x");
node(store, ORG, "team-vis", "team", "Visible team");
node(store, ORG, "team-other", "team", "Unrelated team");
node(store, ORG, "u-pat", "person", "Pat");
node(store, ORG, "u-zoe", "person", "Zoe");
edge(store, ORG, "team-vis", "can-read", "doc-ok");
edge(store, ORG, "u-pat", "can-read", "doc-ok");
edge(store, ORG, "team-other", "can-read", "doc-no");
edge(store, ORG, "u-zoe", "can-read", "doc-no");
afterAll(() => store.close());

const who = { tenant: ORG, user: "u-kim" };
const ids = ["repo-a", "proj-a", "repo-x", "proj-x", "team-vis", "u-pat", "team-other", "u-zoe", "doc-ok", "doc-no", "ghost"];
const want = [true, true, false, false, true, true, false, false, true, false, false];

describe("visibility by kind", () => {
  it("repos and projects follow their readable document; teams and people follow can-read of one", async () => {
    // Fails if "repo", "project", "person" or "team" is mistyped: that kind would never become visible.
    expect(await (await viewer(view, who)).seesMany(ids.map((id) => ({ id })))).toEqual(want);
  });

  it("gives the same answers when the caller passes kinds in", async () => {
    const byPrefix: Record<string, string> = { repo: "repo", proj: "project", team: "team", u: "person", doc: "document" };
    const kinds = (id: string) => byPrefix[id.split("-")[0] ?? ""];
    const items = ids.map((id) => ({ id, kind: kinds(id) }));
    expect(await (await viewer(view, who)).seesMany(items)).toEqual(want);
  });

  it("trusts a passed kind over the stored one: a node tagged channel stays hidden", async () => {
    // With the hint dropped the store lookup would say "document" and show it.
    expect(await (await viewer(view, who)).seesMany([{ id: "doc-ok", kind: "channel" }])).toEqual([false]);
  });

  it("a node missing from the store is not visible even when the caller names a kind", async () => {
    expect(await (await viewer(view, who)).sees("ghost")).toBe(false);
    expect(await (await viewer(view, who)).sees("ghost", "document")).toBe(false);
  });

  it("a user with no node in the store sees nothing, not even themselves", async () => {
    expect(await (await viewer(view, { tenant: ORG, user: "u-nobody" })).sees("u-nobody")).toBe(false);
  });

  it("ids are opaque: a readable document named 'Stryker was here' does not unlock a channel or an unreadable repo", async () => {
    node(store, ORG, "Stryker was here", "document", "Odd id");
    edge(store, ORG, "team-k", "can-read", "Stryker was here");
    node(store, ORG, "chan-k", "channel", "chatter");
    const items = ["Stryker was here", "chan-k", "repo-x"].map((id) => ({ id }));
    expect(await (await viewer(view, who)).seesMany(items)).toEqual([true, false, false]);
  });
});
