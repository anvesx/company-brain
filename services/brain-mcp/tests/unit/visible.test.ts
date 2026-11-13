import { toAsync } from "@anvesx/graph-store";
import { afterAll, describe, expect, it } from "vitest";
import { viewer } from "../../src/access/visible.js";
import { as, edge, node, seedOrg, T0, tempStore } from "../support/graph.js";

// Visibility rule 1 (graph-view spec, reused by mcp-server rule 2) as a point check over a real store file.
const store = tempStore();
const view = toAsync(store); // the server reads through the async contract; seeding stays on the sync store
const ORG = "org-1";
const { visible, hidden } = seedOrg(store, ORG, "u-ada", "u-bob");
afterAll(() => store.close());

describe("viewer.sees", () => {
  it("sees the user, their teams, readable documents and the projects those documents belong to", async () => {
    const v = await viewer(as(view, { tenant: ORG, user: "u-ada" }));
    for (const id of visible) expect(await v.sees(id), id).toBe(true);
  });

  it("never sees a document nobody it acts for can read, nor any channel or ticket", async () => {
    const v = await viewer(as(view, { tenant: ORG, user: "u-ada" }));
    for (const id of [...hidden, "u-bob", "does-not-exist"]) expect(await v.sees(id), id).toBe(false);
  });

  it("hides a co-reader from someone who merely reads the document, and shows them to its owner (leak 4)", async () => {
    node(store, ORG, "u-cy", "person", "Cy");
    edge(store, ORG, "u-cy", "can-read", "doc-plan");
    expect(await (await viewer(as(view, { tenant: ORG, user: "u-ada" }))).sees("u-cy")).toBe(false);
    store.upsertNode(
      {
        tenant: ORG,
        id: "doc-plan",
        kind: "document",
        source: "drive",
        address: "x://doc-plan",
        title: "Quarterly plan final",
        version: "1",
        props: { zone: "company", owner: "u-ada" },
      },
      T0 + 10_000,
    );
    expect(await (await viewer(as(view, { tenant: ORG, user: "u-ada" }))).sees("u-cy")).toBe(true);
  });

  it("acts for the user and their teams, and nobody else", async () => {
    const v = await viewer(as(view, { tenant: ORG, user: "u-ada" }));
    expect([...v.principals].sort()).toEqual(["team-eng", "u-ada"]);
  });

  it("is scoped to one tenant: the same ids elsewhere are invisible", async () => {
    seedOrg(store, "org-2", "u-zed", "u-yan");
    const v = await viewer(as(view, { tenant: "org-2", user: "u-ada" }));
    expect(await v.sees("doc-plan")).toBe(false);
    expect(v.principals.size).toBe(1);
  });

  it("draws nodes as they were at asOf: a node that did not exist yet is not drawn", async () => {
    node(store, ORG, "doc-late", "document", "Written later", T0 + 5_000);
    edge(store, ORG, "team-eng", "can-read", "doc-late", T0 + 5_000);
    expect(await (await viewer(as(view, { tenant: ORG, user: "u-ada" }), T0 + 100)).sees("doc-late")).toBe(false);
    expect(await (await viewer(as(view, { tenant: ORG, user: "u-ada" }))).sees("doc-late")).toBe(true);
  });
});
