import { describe, expect, it } from "vitest";
import { put, stack, TENANT } from "../../support/world.js";

const ids = (hits: { id: string }[]) => hits.map((h) => h.id).sort();

describe("ACL: rank pre-filter and graph reads agree", () => {
  it("an asker without the principal gets zero hits for a doc another asker sees", async () => {
    const s = stack();
    put(s.root, "secret.md", "merger plans", ["ana"]);
    put(s.root, "open.md", "merger announcement", ["ana", "bob"]);
    await s.sync();
    await s.index();

    const as = (u: string) => s.ix.search({ query: "merger", asker: { principals: [`user:${u}`] } });
    expect(ids(as("ana"))).toEqual(["docs/open.md", "docs/secret.md"]);
    expect(ids(as("bob"))).toEqual(["docs/open.md"]);
    expect(as("eve")).toEqual([]);
    expect(s.ix.search({ query: "plans", asker: { principals: ["user:bob"] } })).toEqual([]);

    const reach = (u: string) =>
      s.store
        .reach(TENANT, `user:${u}`, { kinds: ["can-read"], depth: 1, limit: 50 })
        .map((n) => n.id)
        .sort();
    expect(reach("ana")).toEqual(ids(as("ana")));
    expect(reach("bob")).toEqual(ids(as("bob")));
    expect(reach("eve")).toEqual([]);
  });

  it("a group grant through a member-of edge is seen the same way by both reads", async () => {
    const s = stack();
    put(s.root, "eng.md", "oncall rota", [], ["eng"]);
    await s.sync();
    await s.index();
    const at = Date.now();
    s.store.upsertNode({ tenant: TENANT, id: "user:cy", kind: "person", source: "idp", address: "idp/cy", title: "cy", version: "1", props: {} }, at);
    s.store.addEdge({ tenant: TENANT, from: "user:cy", to: "team:eng", kind: "member-of", source: "idp" }, at);

    const graph = s.store.reach(TENANT, "user:cy", { kinds: ["member-of", "can-read"], depth: 2, limit: 50 }).filter((n) => n.kind === "document");
    const withTeam = s.ix.search({ query: "oncall", asker: { principals: ["user:cy", "team:eng"] } });
    const withoutTeam = s.ix.search({ query: "oncall", asker: { principals: ["user:cy"] } });
    expect(graph.map((n) => n.id)).toEqual(["docs/eng.md"]);
    expect(ids(withTeam)).toEqual(["docs/eng.md"]);
    expect(withoutTeam).toEqual([]);
  });

  it("narrowing an ACL removes the hit after the next feed pass", async () => {
    const s = stack();
    put(s.root, "n.md", "handbook", ["ana", "bob"]);
    await s.sync();
    await s.index();
    put(s.root, "n.md", "handbook", ["ana"]);
    await s.sync();
    await s.index();
    const bob = s.ix.search({ query: "handbook", asker: { principals: ["user:bob"] } });
    expect(bob).toEqual([]);
    expect(s.store.neighbors(TENANT, "docs/n.md", { kind: "can-read", dir: "in" }).map((e) => e.from)).toEqual(["user:ana"]);
  });
});
