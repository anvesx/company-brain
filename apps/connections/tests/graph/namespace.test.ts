import { afterEach, describe, expect, it } from "vitest";
import { sourceOf } from "../../src/sync/connector.js";
import { pat, root } from "../http/fixture.js";
import { bootSync } from "../sync/fixture.js";

let h: Awaited<ReturnType<typeof bootSync>> | undefined;
afterEach(async () => h?.close());
const cur = () => h as NonNullable<typeof h>;
const make = async (label: string) =>
  ((await (await cur().s.call("POST", "/v1/accounts", root, { ...pat, label, dataZone: "company" })).json()) as { id: string }).id;
const sync = async (id: string) => (await cur().s.call("POST", `/v1/accounts/${id}/sync`, root, { repo: "acme/handbook" })).json();
const doc = (id: string, path: string) => `${sourceOf({ provider: "github", id })}/${path}`;
const readers = (id: string, path: string) =>
  cur()
    .graph.neighbors("t1", doc(id, path), { kind: "can-read", dir: "in" })
    .map((e) => e.from)
    .sort();

describe("two accounts listing the same path", () => {
  it("get separate document nodes that keep the real address", async () => {
    h = await bootSync();
    const [a, b] = [await make("a"), await make("b")];
    await sync(a);
    await sync(b);
    for (const id of [a, b]) {
      expect(cur().graph.node("t1", doc(id, "README.md"))).toMatchObject({ kind: "document", address: "README.md", source: `github:${id}` });
    }
    expect(cur().graph.node("t1", "README.md")).toBeUndefined();
  });
  it("converge when synced in turn, and one sync never tombstones the other's documents", async () => {
    h = await bootSync();
    const [a, b] = [await make("a"), await make("b")];
    await sync(a);
    await sync(b);
    expect(await sync(a)).toMatchObject({ nodes: 0, edges: 0, removed: 0 });
    expect(cur().graph.node("t1", doc(b, "docs/guide.md"))).toBeDefined();
  });
  it("keep every edge of B when A disconnects, and groups are per account", async () => {
    h = await bootSync();
    const [a, b] = [await make("a"), await make("b")];
    await sync(a);
    await sync(b);
    const before = readers(b, "README.md");
    expect(before).toEqual(
      ["hubot", "octocat", `${sourceOf({ provider: "github", id: b })}/acme/docs`, `${sourceOf({ provider: "github", id: b })}/acme/justice-league`].sort(),
    );
    expect((await cur().s.call("DELETE", `/v1/accounts/${a}`, root)).status).toBe(204);
    expect(readers(a, "README.md")).toEqual([]);
    expect(readers(b, "README.md")).toEqual(before);
    const groups = cur().graph.neighbors("t1", "octocat", { kind: "member-of", dir: "out" });
    expect(groups.length).toBeGreaterThan(0);
    expect(groups.every((e) => e.to.startsWith(`github:${b}/`))).toBe(true);
  });
});
