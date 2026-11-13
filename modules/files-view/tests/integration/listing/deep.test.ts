import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { boot, clusterRows, type Env, ids } from "../support/app.js";
import { bulk } from "../support/world.js";

let env: Env;
const [T, v] = ["dp", { tenant: "dp", user: "alice" }];
const props = (zone: string) => ({
  owner: "z",
  zone,
  ...(zone === "team" ? { team: "secret" } : {}),
  mime: "text/plain",
  size: "1",
  modified: "2026-01-01T00:00:00Z",
});

beforeAll(async () => {
  env = await boot();
  const node = (id: string, kind: "person" | "project", p: Record<string, string> = {}) =>
    env.store.upsertNode({ tenant: T, id, kind, source: "x", address: id, title: id, version: "1", props: p }, 1);
  await node("alice", "person");
  await node("big", "project", { "cluster.type": "topic", "cluster.why": "Same folder /big" });
  // 1,100 files the gate hides (team zone, a team alice is not in) sort before the one file she may read.
  await bulk(env.pool, T, "a", 1_100, (i) => ({ title: `hidden ${i}`, props: props("team") }));
  await bulk(env.pool, T, "z", 1, () => ({ title: "the one", props: props("company") }));
  for (const [prefix, n] of [
    ["a", 1_100],
    ["z", 1],
  ] as const)
    await env.pool.query(
      "INSERT INTO edges (tenant,from_id,to_id,kind,source,valid_from) SELECT $1,$2||g,'big','belongs-to','t',1 FROM generate_series(0,$3) g",
      [T, prefix, n - 1],
    );
}, 120_000);
afterAll(async () => env.stop(), 120_000);

describe("a cluster whose first batches are entirely hidden", () => {
  it("still lists its single visible file, and no hidden one", async () => {
    const r = await env.call("/clusters/big", v);
    expect(r.status).toBe(200);
    expect(ids(r.body)).toEqual(["z0"]);
    expect(r.body).not.toMatch(/hidden \d/);
  });
  it("is still shown in the cluster tree with its why", async () => {
    const t = await env.call("/clusters", v);
    expect(clusterRows(t.body).map((c) => c.id)).toEqual(["big"]);
    expect(t.body).toContain("Same folder /big");
  });
});
