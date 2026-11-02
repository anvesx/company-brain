import { rmSync, utimesSync } from "node:fs";
import { join } from "node:path";
import type { Doc } from "@anvesx/rank";
import { describe, expect, it } from "vitest";
import { put, stack } from "../support/world.js";

const seen = (): { docs: Doc[]; gate: (d: Doc) => Doc } => {
  const docs: Doc[] = [];
  return {
    docs,
    gate: (d) => {
      docs.push(d);
      return d;
    },
  };
};

describe("reindex builds the document it indexes", () => {
  it("carries title, path, body, readers, no links and the source mtime", async () => {
    const s = stack();
    put(s.root, "a/notes.md", "hello body", ["ana"]);
    const when = new Date("2024-05-06T07:08:09Z");
    utimesSync(join(s.root, "a/notes.md"), when, when);
    await s.sync();
    const rec = seen();
    await s.index(rec.gate);
    expect(rec.docs).toHaveLength(1);
    const doc = rec.docs[0] as Doc;
    expect(doc.path).toBe("a/notes.md");
    expect(doc.body).toBe("hello body");
    expect(doc.title.length).toBeGreaterThan(0);
    expect(doc.principals).toEqual(["user:ana"]);
    expect(doc.links).toEqual([]);
    expect(doc.mtimeMs).toBe(when.getTime());
  });

  it("forgets a deleted document and returns the diff", async () => {
    const s = stack();
    put(s.root, "x.md", "one", ["ana"]);
    await s.sync();
    expect((await s.index()).created).toHaveLength(1);
    expect(s.known.size).toBe(1);
    rmSync(join(s.root, "x.md"));
    rmSync(join(s.root, "x.md.acl.json"));
    await s.sync();
    expect((await s.index()).deleted).toHaveLength(1);
    expect(s.known.size).toBe(0);
  });
});
