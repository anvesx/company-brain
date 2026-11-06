import { afterAll, describe, expect, it } from "vitest";
import { viewer } from "../../src/access/visible.js";
import { edge, node, seedOrg, T0, tempStore } from "../support/graph.js";

// Visibility rule 1 (graph-view spec, reused by mcp-server rule 2) as a point check over a real store file.
const store = tempStore();
const ORG = "org-1";
const { visible, hidden } = seedOrg(store, ORG, "u-ada", "u-bob");
afterAll(() => store.close());

describe("viewer.sees", () => {
  it("sees the user, their teams, readable documents and the projects those documents belong to", () => {
    const v = viewer(store, { tenant: ORG, user: "u-ada" });
    for (const id of visible) expect(v.sees(id), id).toBe(true);
  });

  it("never sees a document nobody it acts for can read, nor any channel or ticket", () => {
    const v = viewer(store, { tenant: ORG, user: "u-ada" });
    for (const id of [...hidden, "u-bob", "does-not-exist"]) expect(v.sees(id), id).toBe(false);
  });

  it("sees another principal once that principal can read a document the user can read", () => {
    node(store, ORG, "u-cy", "person", "Cy");
    edge(store, ORG, "u-cy", "can-read", "doc-plan");
    expect(viewer(store, { tenant: ORG, user: "u-ada" }).sees("u-cy")).toBe(true);
  });

  it("acts for the user and their teams, and nobody else", () => {
    const v = viewer(store, { tenant: ORG, user: "u-ada" });
    expect([...v.principals].sort()).toEqual(["team-eng", "u-ada"]);
  });

  it("is scoped to one tenant: the same ids elsewhere are invisible", () => {
    seedOrg(store, "org-2", "u-zed", "u-yan");
    const v = viewer(store, { tenant: "org-2", user: "u-ada" });
    expect(v.sees("doc-plan")).toBe(false);
    expect(v.principals.size).toBe(1);
  });

  it("reads the graph as it was at asOf", () => {
    node(store, ORG, "doc-late", "document", "Written later", T0 + 5_000);
    edge(store, ORG, "team-eng", "can-read", "doc-late", T0 + 5_000);
    expect(viewer(store, { tenant: ORG, user: "u-ada" }, T0 + 100).sees("doc-late")).toBe(false);
    expect(viewer(store, { tenant: ORG, user: "u-ada" }).sees("doc-late")).toBe(true);
  });
});
