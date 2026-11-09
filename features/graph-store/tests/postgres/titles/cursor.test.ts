import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import * as gs from "../../../src/index.js";
import { node } from "../../support/helpers.js";
import { factories, schemaPool } from "../../support/pg/factories.js";

const pgFactory = factories.find((f) => f.name === "postgres")!;

// Known limit, pinned so a change to it is a decision: the seq cursor is a discovery page, not a change feed.
// A transaction that took its seq number before another one committed, but commits after a reader paged past
// that number, is never shown to that reader's later pages. A new scan from the start finds it.
describe.skipIf(pgFactory.skip !== undefined)("postgres: scan cursor and a late commit", () => {
  it("a row committed with a seq below the cursor is skipped by the next page and found by a new scan", async () => {
    const pool = await schemaPool(`c_${randomBytes(6).toString("hex")}`);
    const store = await gs.createPostgresGraphStore({ pool });
    // Writer A takes its seq first (as INSERT would) but has not committed yet.
    const late = Number((await pool.query("SELECT nextval(pg_get_serial_sequence('nodes', 'seq')) AS s")).rows[0].s);
    await store.upsertNode(node("early", { title: "report early" }), 10); // writer B commits first, with a higher seq
    await store.upsertNode(node("later", { title: "report later" }), 10);
    const first = await store.scanTitles("t1", { text: "report", limit: 1 });
    expect(first.nodes.map((n) => n.id)).toEqual(["early"]);
    expect(first.next).toBeGreaterThan(late);
    // Writer A commits now, with the seq it took before B.
    await pool.query(
      `INSERT INTO nodes (seq, tenant, id, kind, source, address, title, version, props, valid_from)
       OVERRIDING SYSTEM VALUE VALUES ($1, 't1', 'late', 'document', 'test', 'a', 'report late', '1', '[]', 0)`,
      [late],
    );
    const rest = await store.scanTitles("t1", { text: "report", limit: 10, cursor: first.next! });
    expect(rest.nodes.map((n) => n.id)).toEqual(["later"]); // "late" is behind the cursor
    const again = await store.scanTitles("t1", { text: "report", limit: 10 });
    expect(again.nodes.map((n) => n.id)).toEqual(["late", "early", "later"]);
  });
});
