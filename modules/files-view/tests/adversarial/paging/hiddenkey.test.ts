import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { A, boot, type World } from "../support/world.js";

let w: World;
const props = { owner: "bob", zone: "company", mime: "a", size: "1", modified: "2026-01-01T00:00:00Z" };
beforeAll(async () => {
  w = await boot();
  // 17,000 files only bob can read, all sorting before the one file alice can read: more hidden rows than any bounded over-fetch scans.
  await w.bulk(17_000, (i) => ({ title: `HIDDEN-${String(i).padStart(5, "0")}`, props }), { readers: ["bob"] });
  await w.file("zz", { title: "ZZZ-alice-file", readers: ["alice"] });
}, 120_000);
afterAll(() => w.close());

describe("cursor must not leak hidden rows", () => {
  it("a short page's next cursor never embeds the title, size, modified or id of a file alice cannot see", async () => {
    let url = "/files?limit=20&sort=title&dir=asc";
    for (let hop = 0; hop < 3; hop++) {
      const r = await w.get(url, A);
      expect(r.status).toBe(200);
      const raw = /cursor=([A-Za-z0-9_-]+)/.exec(r.body)?.[1];
      if (!raw) return;
      const text = Buffer.from(raw, "base64url").toString("utf8");
      expect(text, "cursor decodes to a hidden file's sort key").not.toMatch(/HIDDEN-|"i":"b\d+"/);
      url = `/files?limit=20&sort=title&dir=asc&cursor=${raw}`;
    }
  }, 240_000);
  it("alice eventually reaches her one file by following next links, within a bounded number of hops", async () => {
    let url = "/files?limit=20&sort=title&dir=asc";
    for (let hop = 0; hop < 12; hop++) {
      const r = await w.get(url, A);
      if (r.body.includes("ZZZ-alice-file")) return;
      const next = /href="([^"]*cursor=[^"]+)"/.exec(r.body)?.[1];
      if (!next) break;
      url = next.replaceAll("&amp;", "&");
    }
    expect.fail("never reached the only visible file");
  }, 240_000);
});
