import { DatabaseSync } from "node:sqlite";
import { describe, expect, it } from "vitest";
import { doc } from "../support/docs.js";
import { useTmpFile } from "../support/tmpfile.js";

const asker = { principals: ["company"] };
const { file, open } = useTmpFile();

describe("file settings", () => {
  it("puts the database in WAL mode, which readers rely on to see whole batches", () => {
    open().close();
    const db = new DatabaseSync(file(), { readOnly: true });
    expect(db.prepare("PRAGMA journal_mode").get()).toEqual({ journal_mode: "wal" });
    db.close();
  });
});

describe("probe", () => {
  it("reports each stage once, in order, with a non-negative time", () => {
    const ix = open();
    ix.index([doc("a", { title: "alpha" })]);
    const seen: [string, number][] = [];
    ix.search({ query: "alpha", asker }, (stage, ms) => seen.push([stage, ms]));
    expect(seen.map(([s]) => s)).toEqual(["terms", "stats", "postings", "meta", "links", "score"]);
    for (const [, ms] of seen) expect(ms).toBeGreaterThanOrEqual(0);
  });
  it("stops reporting where the search ends early", () => {
    const ix = open();
    const seen: string[] = [];
    ix.search({ query: "!!!", asker }, (s) => seen.push(s));
    expect(seen).toEqual(["terms"]);
    ix.search({ query: "alpha", asker }, (s) => seen.push(s));
    expect(seen).toEqual(["terms", "terms", "stats"]);
  });
});
