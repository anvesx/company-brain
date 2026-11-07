import { toAsync } from "@anvesx/graph-store";
import { afterAll, describe, expect, it } from "vitest";
import { search } from "../../../../src/tools/read/search.js";
import { edge, node, tempStore } from "../../../support/graph.js";

// brain.search against a real store file. Ada reads through team-eng; every "zeta" title below matches the query.
const store = tempStore();
const T = "org-s";
const ctx = { store: toAsync(store), caller: { tenant: T, user: "u-ada" }, accounts: async () => [] };
const ids = async (args: Partial<Parameters<typeof search>[1]> = {}) => (await search(ctx, { query: "zeta", limit: 20, ...args })).nodes.map((n) => n.id);
afterAll(() => store.close());

node(store, T, "u-ada", "person", "Ada");
node(store, T, "team-eng", "team", "Engineering");
edge(store, T, "u-ada", "member-of", "team-eng");
node(store, T, "doc-vis", "document", "zeta visible doc");
edge(store, T, "team-eng", "can-read", "doc-vis");
node(store, T, "doc-hid", "document", "zeta hidden doc"); // nobody Ada acts for can read it
// Each kind has one node Ada may see (tied to doc-vis) and one she may not (no edges at all).
for (const kind of ["person", "team", "project", "repo"] as const) {
  node(store, T, `${kind}-hid`, kind, `zeta hidden ${kind}`);
  node(store, T, `${kind}-vis`, kind, `zeta visible ${kind}`);
  if (kind === "project" || kind === "repo") edge(store, T, "doc-vis", "belongs-to", `${kind}-vis`);
  else edge(store, T, `${kind}-vis`, "can-read", "doc-vis");
}
node(store, T, "chan-z", "channel", "zeta channel"); // channels never show
node(store, T, "tick-z", "ticket", "zeta ticket"); // tickets never show

describe("brain.search visibility", () => {
  it("rejects a blank query with the exact message", async () => {
    // A whitespace-only query must fail loudly, not scan the whole graph.
    await expect(search(ctx, { query: "  ", limit: 5 })).rejects.toMatchObject({ code: "INVALID_ARGUMENT", message: "query must not be blank" });
  });

  it("keeps a visible node of each of person, team, project and repo and drops the hidden one", async () => {
    // A hidden project/team/repo/person is dropped even though its title matches; the visible twin must stay.
    const got = await ids();
    for (const kind of ["person", "team", "project", "repo"]) {
      expect(got, `${kind} visible`).toContain(`${kind}-vis`);
      expect(got, `${kind} hidden`).not.toContain(`${kind}-hid`);
    }
  });

  it("returns exactly the visible matches: documents by edge probe, the rest by the viewer, never channels or tickets", async () => {
    expect((await ids()).sort()).toEqual(["doc-vis", "person-vis", "project-vis", "repo-vis", "team-vis"]);
  });

  it("filters each kind alone when asked for that kind", async () => {
    // With kinds narrowed, the page holds only that kind, so a misaligned batch of answers would show a hidden one.
    expect(await ids({ kinds: ["person"] })).toEqual(["person-vis"]);
    expect(await ids({ kinds: ["document"] })).toEqual(["doc-vis"]);
  });

  it("does not hand a hidden non-document the answer meant for an earlier document", async () => {
    // Insertion order is doc-vis, ..., so a document ahead of a hidden person must not shift the person's answer.
    const first = await ids({ kinds: ["document", "person"] });
    expect(first.sort()).toEqual(["doc-vis", "person-vis"]);
  });
});
