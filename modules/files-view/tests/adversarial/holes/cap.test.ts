import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { A, boot, type World } from "../support/world.js";

let w: World;
const json = { headers: { accept: "application/json" } };
beforeAll(async () => {
  w = await boot();
  await w.cluster("capc", { title: "CapCluster", why: "many hidden then one visible" });
  const props = { owner: "zed", zone: "personal", mime: "a", size: "1", modified: "2026-01-01T00:00:00Z" };
  await w.bulk(700, (i) => ({ title: `H${i}`, props }));
  await w.pool.query(
    `INSERT INTO edges (tenant,from_id,to_id,kind,source,valid_from) SELECT 't1','b'||g,'capc','belongs-to','brain',1 FROM generate_series(0,699) g`,
  );
  await w.file("zz-visible", { title: "VisibleLast" });
  await w.link("zz-visible", "capc");
  await w.file("dup", { title: "Dup" });
  await w.cluster("d1", { title: "D1", why: "d" });
  await w.link("dup", "d1");
  await w.store.addEdge({ tenant: "t1", from: "dup", to: "d1", kind: "belongs-to", source: "other" }, 1);
  await w.cluster("d2", { title: "D2", why: "d" });
  await w.link("dup", "d2");
});
afterAll(() => w.close());

describe("member cap and duplicate edges", () => {
  it("MEDIUM: a cluster whose first 500 member ids are gate-hidden still shows its visible file", async () => {
    const r = await w.get("/clusters/capc", A, json);
    expect(r.status).toBe(200);
    expect(r.body).toContain("zz-visible");
    expect((await w.get("/clusters", A, json)).body).toContain("capc");
  });
  it("LOW: two belongs-to edges (different source) to one cluster give one chip, not two", async () => {
    const r = await w.get("/files/dup", A, json);
    const paths = (JSON.parse(r.body) as { paths: { id: string }[] }).paths.map((p) => p.id);
    expect(paths.sort()).toEqual(["d1", "d2"]);
  });
});
