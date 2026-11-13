import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { A, boot, type World } from "../support/world.js";

let w: World;
const json = { headers: { accept: "application/json" } };
beforeAll(async () => {
  w = await boot();
  await w.cluster("root", { title: "Root", why: "r" });
  await w.cluster("secret-layoffs-2026", { title: "Layoffs", why: "hidden people", parent: "root" });
  await w.cluster("open", { title: "Open", why: "o", parent: "root" });
  await w.file("seen", { title: "Seen" });
  await w.file("hid", { title: "Hid", zone: "personal", owner: "zed" });
  await w.link("seen", "open");
  await w.link("hid", "secret-layoffs-2026");
});
afterAll(() => w.close());

describe("ids of clusters with no visible file", () => {
  it("HIGH-LOW: JSON /clusters/:id never lists a hidden-only child cluster id in `subtree`", async () => {
    const r = await w.get("/clusters/root", A, json);
    expect(r.status).toBe(200);
    expect(r.body).not.toContain("secret-layoffs-2026");
  });
  it("JSON /clusters never names a hidden-only cluster anywhere", async () => {
    expect((await w.get("/clusters", A, json)).body).not.toContain("secret-layoffs-2026");
  });
  it("file JSON/HTML paths never name a hidden-only cluster", async () => {
    expect((await w.get("/files", A, json)).body).not.toContain("secret-layoffs-2026");
    expect((await w.get("/files?cluster=secret-layoffs-2026", A)).body).not.toContain("Hid");
  });
});
