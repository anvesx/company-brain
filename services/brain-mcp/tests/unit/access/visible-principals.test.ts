import { toAsync } from "@anvesx/graph-store";
import { afterAll, describe, expect, it } from "vitest";
import { viewer } from "../../../src/access/visible.js";
import { edge, node, T0, T1, tempStore } from "../../support/graph.js";

// Who a viewer acts for: the user plus the teams reached by member-of edges that point OUT of the user, as of asOf.
const store = tempStore();
const view = toAsync(store);
const ORG = "org-p";
node(store, ORG, "u-ann", "person", "Ann");
node(store, ORG, "team-in", "team", "Points In");
node(store, ORG, "team-out", "team", "Reached Out");
node(store, ORG, "team-read", "team", "Read Only");
node(store, ORG, "team-late", "team", "Joined Later");
edge(store, ORG, "team-in", "member-of", "u-ann"); // wrong direction: the team is a member of Ann
edge(store, ORG, "u-ann", "member-of", "team-out");
edge(store, ORG, "u-ann", "can-read", "team-read"); // wrong kind: reading a team is not belonging to it
edge(store, ORG, "u-ann", "member-of", "team-late", T1);
afterAll(() => store.close());

describe("viewer principals", () => {
  it("contains only teams reached by member-of edges pointing out of the user", async () => {
    const v = await viewer(view, { tenant: ORG, user: "u-ann" });
    // team-in (edge points in) and team-read (can-read edge) must not be principals.
    expect([...v.principals].sort()).toEqual(["team-late", "team-out", "u-ann"]);
  });

  it("ignores memberships created after asOf, and includes them with no asOf", async () => {
    const early = await viewer(view, { tenant: ORG, user: "u-ann" }, T0 + 100);
    expect([...early.principals].sort()).toEqual(["team-out", "u-ann"]);
    const now = await viewer(view, { tenant: ORG, user: "u-ann" });
    expect(now.principals.has("team-late")).toBe(true);
  });
});
