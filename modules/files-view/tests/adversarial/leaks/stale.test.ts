import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { A, B, boot, type World } from "../support/world.js";

let w: World;
const json = { headers: { accept: "application/json" } };
const tree = async (c = A) => (JSON.parse((await w.get("/clusters", c, json)).body) as { clusters: { id: string }[] }).clusters.map((c) => c.id);
const sleep = (ms: number) => new Promise((ok) => setTimeout(ok, ms));
beforeAll(async () => {
  w = await boot();
  await w.cluster("secret-cl", { title: "SecretCluster", why: "w" });
  await w.file("sf", { title: "SF", readers: ["alice"] });
  await w.link("sf", "secret-cl");
});
afterAll(() => w.close());

describe("stale visibility behind the slow-answer cache", () => {
  it("HIGH-MEDIUM: a revoke is visible on the very next /clusters even when the previous answer was slow (>250 ms)", async () => {
    w.w.recheck = async () => {
      await sleep(320);
      return true;
    }; // makes the tree build slow, so the cache keeps it
    expect(await tree()).toEqual(["secret-cl"]);
    await w.store.removeEdge({ tenant: "t1", from: "alice", to: "sf", kind: "can-read", source: "drive" }, 9);
    w.w.recheck = async () => true;
    expect(await tree()).toEqual([]);
  });
  it("a tombstoned file stops counting on the next /clusters after a slow answer", async () => {
    await w.file("sg", { title: "SG", readers: ["bob"] });
    await w.cluster("other-cl", { title: "Other", why: "w" });
    await w.link("sg", "other-cl");
    w.w.recheck = async () => {
      await sleep(320);
      return true;
    };
    expect(await tree(B)).toEqual(["other-cl"]);
    await w.store.tombstone("t1", "sg", 10);
    w.w.recheck = async () => true;
    expect(await tree(B)).toEqual([]);
  });
});
