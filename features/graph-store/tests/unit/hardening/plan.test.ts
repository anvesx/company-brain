import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { describe, expect, it } from "vitest";
import { openDb } from "../../../src/index.js";
import { titleFilter } from "../../../src/scan/filters.js";
import { chunkSql, FTS_CANDIDATES } from "../../../src/scan/scan.js";
import { searchSql } from "../../../src/scan/search.js";
import { tmpDir } from "../../support/helpers.js";

// D5: the edge check must use the edges_in index and the title search the FTS index. A full scan of nodes or
// nodes_history here is the 100k-node latency bug, so the query plans themselves are asserted.
const explain = (path: string, sql: string, args: (string | number)[]) => {
  const raw = new DatabaseSync(path);
  try {
    return raw
      .prepare(`EXPLAIN QUERY PLAN ${sql}`)
      .all(...args)
      .map((r) => String(r["detail"]))
      .join("\n");
  } finally {
    raw.close();
  }
};
const reader = { from: ["u1", "u2"], kind: "can-read" as const };

describe("title query plans", () => {
  // tmpDir() is removed after every test, so each test makes its own database file with the real schema.
  const fresh = () => {
    const path = join(tmpDir(), "plan.db");
    openDb(path).close();
    return path;
  };

  it("searchTitles: FTS index plus the edges_in index, no full scan of nodes", () => {
    const { sql, args } = searchSql("t1", { text: "report", limit: 5, reachedBy: reader });
    const plan = explain(fresh(), sql, args);
    expect(plan).toMatch(/VIRTUAL TABLE INDEX/);
    expect(plan).toMatch(/USING (COVERING )?INDEX edges_in/);
    expect(plan).not.toMatch(/SCAN (n|nodes)\b/);
    expect(plan).not.toMatch(/nodes_history/);
  });

  it("scanTitles: candidates from the FTS index, verified by rowid lookup, edges_in for the edge rule", () => {
    const f = titleFilter("t1", { text: "report", reachedBy: reader });
    const path = fresh();
    expect(explain(path, FTS_CANDIDATES, ['"report"', 0, 10])).toMatch(/VIRTUAL TABLE INDEX/);
    const plan = explain(path, chunkSql(f.where, 256), [...Array.from({ length: 256 }, (_, i) => i + 1), ...f.args]);
    expect(plan).toMatch(/SEARCH n USING INTEGER PRIMARY KEY \(rowid=\?\)/);
    expect(plan).toMatch(/USING (COVERING )?INDEX edges_in/);
    expect(plan).not.toMatch(/SCAN (n|nodes)\b/);
  });
});
