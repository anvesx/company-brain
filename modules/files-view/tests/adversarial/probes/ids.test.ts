import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { A, boot, type World } from "../support/world.js";

let w: World;
const odd = ["a b", "q?x=1", "h#ash", "p%25", "s/l/ash", "é€😀", "a&b=c"];
beforeAll(async () => {
  w = await boot();
  for (const id of odd) await w.file(id, { title: `T ${id}` });
  await w.file("blank", { title: "" });
  await w.file("spaces", { title: "   " });
  await w.file("v1", { title: "Old title" });
  await w.file("v1", { title: "New title" });
  await w.cluster("c/1?#", { why: "odd id" });
  await w.link("a b", "c/1?#");
});
afterAll(() => w.close());
const json = { headers: { accept: "application/json" } };

describe("ids and titles that break links", () => {
  it("MEDIUM: every row link for an id with space, ?, #, %, / or unicode opens that same file", async () => {
    const body = (await w.get("/files?limit=100", A)).body;
    for (const id of odd) {
      const href = new RegExp(`href="(/files/[^"]*)"[^>]*>\\s*T ${id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/&/g, "(?:&amp;|&)")}`).exec(body)?.[1];
      expect(href, `no link for ${id}`).toBeTruthy();
      const r = await w.get((href as string).replace(/&amp;/g, "&"), A, json);
      expect(r.status, `${id} via ${href}`).toBe(200);
      expect(JSON.parse(r.body).id).toBe(id);
    }
  });
  it("MEDIUM: a cluster chip for an id with ? and # links to that cluster", async () => {
    const r = await w.get("/files/a%20b", A);
    const href = /href="(\/clusters\/[^"]*)"/.exec(r.body)?.[1];
    expect(href).toBeTruthy();
    expect((await w.get((href as string).replace(/&amp;/g, "&"), A)).status).toBe(200);
  });
  it("LOW: an empty or blank title still gives the row link readable text (axe link-name)", async () => {
    const body = (await w.get("/files?limit=100", A)).body;
    for (const id of ["blank", "spaces"]) {
      const text = new RegExp(`<a[^>]*href="/files/${id}"[^>]*>([^<]*)</a>`).exec(body)?.[1] ?? "";
      expect(text.trim(), `link text for ${id}`).not.toBe("");
    }
  });
  it("a re-versioned file lists once under its new title and the old title finds nothing", async () => {
    expect((await w.get("/files?q=New%20title", A)).body.match(/href="\/files\/v1"/g)?.length).toBe(1);
    expect((await w.get("/files?q=Old%20title", A)).body).not.toContain('href="/files/v1"');
  });
});
