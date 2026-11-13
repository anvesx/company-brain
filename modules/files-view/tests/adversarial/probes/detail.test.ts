import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { A, boot, type World } from "../support/world.js";

let w: World;
const calls: string[] = [];
beforeAll(async () => {
  w = await boot();
  w.w.recheck = async (d) => {
    calls.push(d.id);
    return d.id !== "gone";
  };
  await w.file("ok");
  await w.file("gone");
  await w.cluster("c", { why: "w" });
  await w.link("ok", "c");
  await w.link("gone", "c");
});
afterAll(() => w.close());
const per = () => Math.max(0, ...[...new Set(calls)].map((id) => calls.filter((c) => c === id).length));

describe("one live recheck per distinct file id per request", () => {
  for (const path of ["/files/ok", "/files/gone", "/files", "/clusters", "/clusters/c", "/files?cluster=c"])
    it(`LOW: GET ${path} asks the source at most once for any file id`, async () => {
      calls.length = 0;
      await w.get(path, A);
      expect(per()).toBeLessThanOrEqual(1);
    });
});

describe("admin is not a tenant or zone bypass", () => {
  it("an admin cannot see another user's personal file, another tenant's file or a zone-less file", async () => {
    await w.file("priv", { zone: "personal", owner: "zed" });
    await w.file("foreign", { tenant: "t2" });
    await w.file("nozone", { zone: "" });
    const r = await w.get("/files?limit=100", { tenant: "t1", user: "alice", role: "admin" }, { headers: { accept: "application/json" } });
    for (const id of ["priv", "foreign", "nozone"]) expect(r.body).not.toContain(`"${id}"`);
  });
});
