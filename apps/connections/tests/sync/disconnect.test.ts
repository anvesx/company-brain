import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { closeAccountEdges } from "../../src/sync/disconnect.js";
import { ann, bob, pat, root } from "../http/fixture.js";
import { bootSync, withOther } from "./fixture.js";

let h: Awaited<ReturnType<typeof bootSync>> | undefined;
afterEach(async () => h?.close());
const cur = () => h as NonNullable<typeof h>;
const make = async (extra: object = {}) =>
  ((await (await cur().s.call("POST", "/v1/accounts", root, { ...pat, dataZone: "company", ...extra })).json()) as { id: string }).id;
const sync = (id: string, repo: string) => cur().s.call("POST", `/v1/accounts/${id}/sync`, root, { repo });
const edges = (id: string) => (["can-read", "member-of"] as const).map((k) => cur().graph.edgesBySource("t1", `github:${id}`, k).length);

describe("DELETE /v1/accounts/:id after a sync", () => {
  it("closes that account's can-read and member-of edges and leaves other accounts alone", async () => {
    h = await bootSync({}, withOther);
    const [a, b] = [await make(), await make({ label: "other" })];
    await sync(a, "acme/handbook");
    await sync(b, "acme/other");
    expect(edges(a)[0]).toBeGreaterThan(0);
    expect(edges(a)[1]).toBeGreaterThan(0);
    expect((await h.s.call("DELETE", `/v1/accounts/${a}`, root)).status).toBe(204);
    expect(edges(a)).toEqual([0, 0]);
    expect(h.graph.neighbors("t1", `github:${a}/README.md`, { kind: "can-read", dir: "in" })).toEqual([]);
    expect(h.graph.neighbors("t1", "octocat", { kind: "member-of", dir: "out" })).toEqual([]);
    expect(h.graph.node("t1", `github:${a}/README.md`)).toBeDefined();
    expect(edges(b)).toEqual([1, 0]);
    expect(h.graph.neighbors("t1", `github:${b}/other.md`, { kind: "can-read", dir: "in" }).map((e) => e.from)).toEqual(["zed"]);
  });
  it("does not touch the graph when a non-owner tries", async () => {
    h = await bootSync();
    const id = await make({ access: "company" });
    await sync(id, "acme/handbook");
    const before = edges(id);
    expect((await h.s.call("DELETE", `/v1/accounts/${id}`, bob)).status).toBe(403);
    expect(edges(id)).toEqual(before);
    expect((await h.s.call("DELETE", `/v1/accounts/${id}`, ann)).status).toBe(403);
  });
  it("still deletes an account that never synced, and works with no graph configured", async () => {
    h = await bootSync();
    expect((await h.s.call("DELETE", `/v1/accounts/${await make()}`, root)).status).toBe(204);
    const bare = await bootSync({ sync: undefined as never });
    const id = ((await (await bare.s.call("POST", "/v1/accounts", root, pat)).json()) as { id: string }).id;
    expect((await bare.s.call("DELETE", `/v1/accounts/${id}`, root)).status).toBe(204);
    await bare.close();
  });
  it("rewrites the token file without the deleted account's token", async () => {
    const file = join((await import("node:os")).tmpdir(), `tok-${process.pid}.json`);
    h = await bootSync({ tokensFile: file });
    const id = await make();
    await h.s.call("DELETE", `/v1/accounts/${id}`, root);
    expect(existsSync(file)).toBe(true);
    expect(readFileSync(file, "utf8")).not.toContain("ghp_secret");
    expect(JSON.parse(readFileSync(file, "utf8"))).toEqual({});
  });
  it("closes edges at the request clock in milliseconds", async () => {
    let t = 1_800_000_000;
    h = await bootSync({ now: () => t });
    const a = await make();
    await sync(a, "acme/handbook");
    t += 100;
    await cur().s.call("DELETE", `/v1/accounts/${a}`, root);
    const ms = t * 1000;
    const live = (asOf: number) => cur().graph.neighbors("t1", `github:${a}/README.md`, { kind: "can-read", dir: "in", asOf }).length;
    expect(live(ms - 1)).toBeGreaterThan(0);
    expect(live(ms)).toBe(0);
  });
  it("reports exactly how many edges it closed", async () => {
    h = await bootSync();
    const a = await make();
    await sync(a, "acme/handbook");
    const n = (edges(a)[0] ?? 0) + (edges(a)[1] ?? 0);
    expect(n).toBeGreaterThan(2);
    expect(closeAccountEdges(cur().graph, cur().s.store.get(a) as never, 5)).toBe(n);
    expect(closeAccountEdges(cur().graph, cur().s.store.get(a) as never, 6)).toBe(0);
  });
});
