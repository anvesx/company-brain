import { describe, expect, it } from "vitest";
import { put, stack, TENANT } from "../../support/world.js";

const reach = (s: ReturnType<typeof stack>, user: string) =>
  s.store
    .reach(TENANT, `user:${user}`, { kinds: ["can-read"], depth: 1, limit: 50 })
    .map((n) => n.id)
    .sort();
const readable = (s: ReturnType<typeof stack>, principal: string) =>
  s
    .docs()
    .filter((d) => d.readers.includes(principal))
    .map((d) => d.id)
    .sort();

describe("ACL: the listing's readers and graph reads agree", () => {
  it("a reader the ACL omits sees nothing another reader sees", async () => {
    const s = stack();
    put(s.root, "secret.md", "merger plans", ["ana"]);
    put(s.root, "open.md", "merger announcement", ["ana", "bob"]);
    await s.sync();

    expect(readable(s, "user:ana")).toEqual(["docs/open.md", "docs/secret.md"]);
    expect(readable(s, "user:bob")).toEqual(["docs/open.md"]);
    expect(readable(s, "user:eve")).toEqual([]);
    for (const u of ["ana", "bob", "eve"]) expect(reach(s, u)).toEqual(readable(s, `user:${u}`));
  });

  it("a group grant through a member-of edge is seen the same way by both reads", async () => {
    const s = stack();
    put(s.root, "eng.md", "oncall rota", [], ["eng"]);
    await s.sync();
    const at = Date.now();
    s.store.upsertNode({ tenant: TENANT, id: "user:cy", kind: "person", source: "idp", address: "idp/cy", title: "cy", version: "1", props: {} }, at);
    s.store.addEdge({ tenant: TENANT, from: "user:cy", to: "team:eng", kind: "member-of", source: "idp" }, at);

    const graph = s.store.reach(TENANT, "user:cy", { kinds: ["member-of", "can-read"], depth: 2, limit: 50 }).filter((n) => n.kind === "document");
    expect(graph.map((n) => n.id)).toEqual(["docs/eng.md"]);
    expect(readable(s, "team:eng")).toEqual(["docs/eng.md"]);
    expect(readable(s, "user:cy")).toEqual([]);
  });

  it("narrowing an ACL drops the reader from the listing after the next feed pass", async () => {
    const s = stack();
    put(s.root, "n.md", "handbook", ["ana", "bob"]);
    await s.sync();
    expect(s.docs()[0]?.readers).toEqual(["user:ana", "user:bob"]);
    put(s.root, "n.md", "handbook", ["ana"]);
    await s.sync();
    expect(s.docs()[0]?.readers).toEqual(["user:ana"]);
    expect(s.store.neighbors(TENANT, "docs/n.md", { kind: "can-read", dir: "in" }).map((e) => e.from)).toEqual(["user:ana"]);
  });
});
