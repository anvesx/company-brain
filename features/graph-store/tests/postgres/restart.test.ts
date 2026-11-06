import { randomBytes } from "node:crypto";
import pg from "pg";
import { describe, expect, it } from "vitest";
import * as gs from "../../src/index.js";
import { node } from "../support/helpers.js";
import { until } from "../support/pg/async.js";
import { factories, postgresServer, schemaPool } from "../support/pg/factories.js";

const pgFactory = factories.find((f) => f.name === "postgres")!;

// spec deploy, Behaviour 5-6: the database goes away under a running store.
describe.skipIf(pgFactory.skip !== undefined)("postgres: restart and broken connections", () => {
  it("a transaction killed mid-way rejects, leaves no partial row, and the next write succeeds", async () => {
    const name = `r_${randomBytes(6).toString("hex")}`;
    const pool = await schemaPool(name);
    const s = await gs.createPostgresGraphStore({ pool });
    await s.upsertNode(node("a", { title: "v1" }), 1);
    // Hold an exclusive lock so the store's upsert blocks inside its transaction, then kill that backend.
    const blocker = new pg.Client({ connectionString: (await postgresServer()).url, options: `-c search_path=${name}` });
    await blocker.connect();
    await blocker.query("BEGIN; LOCK TABLE nodes IN ACCESS EXCLUSIVE MODE");
    const pending = s.upsertNode(node("a", { title: "v2" }), 2);
    const waiting = "SELECT pid FROM pg_stat_activity WHERE wait_event_type = 'Lock' AND pid <> pg_backend_pid()";
    await until(async () => (await blocker.query(waiting)).rowCount! > 0);
    await blocker.query(`SELECT pg_terminate_backend(pid) FROM (${waiting}) w`);
    await expect(pending).rejects.toThrow();
    await blocker.query("ROLLBACK");
    await blocker.end();
    expect((await s.history("t1", "a")).map((n) => n.title)).toEqual(["v1"]);
    await s.upsertNode(node("a", { title: "v3" }), 3);
    expect((await s.node("t1", "a"))?.title).toBe("v3");
  });

  it("a connection killed while the INSERT is waiting rejects, leaves no partial row, and the next write succeeds", async () => {
    const name = `r_${randomBytes(6).toString("hex")}`;
    const pool = await schemaPool(name);
    const s = await gs.createPostgresGraphStore({ pool });
    // The blocker holds an uncommitted current row for "b". The store sees no "b", so it gets as far as its INSERT,
    // which then waits on the blocker's unique-index entry. That is the moment the store's backend is killed.
    const blocker = new pg.Client({ connectionString: (await postgresServer()).url, options: `-c search_path=${name}` });
    await blocker.connect();
    await blocker.query("BEGIN");
    await blocker.query(
      "INSERT INTO nodes (tenant, id, kind, source, address, title, version, props, valid_from) VALUES ('t1','b','document','s','b','x','1','[]',0)",
    );
    const pending = s.upsertNode(node("b", { title: "late" }), 2);
    const waiting = "SELECT pid FROM pg_stat_activity WHERE wait_event_type = 'Lock' AND query LIKE 'INSERT INTO nodes%' AND pid <> pg_backend_pid()";
    // Watch from the pool, not the blocker: a connection inside a transaction sees a frozen pg_stat_activity.
    await until(async () => (await pool.query(waiting)).rowCount! > 0);
    await pool.query(`SELECT pg_terminate_backend(pid) FROM (${waiting}) w`);
    await expect(pending).rejects.toThrow();
    await blocker.query("ROLLBACK");
    await blocker.end();
    expect(await s.history("t1", "b")).toEqual([]);
    await s.upsertNode(node("b", { title: "after" }), 3);
    expect((await s.node("t1", "b"))?.title).toBe("after");
  });

  it("a server crash and restart does not crash the process; calls work again once it is back", async () => {
    const server = await postgresServer();
    const pool = await schemaPool(`r_${randomBytes(6).toString("hex")}`);
    const s = await gs.createPostgresGraphStore({ pool });
    await s.upsertNode(node("a"), 1);
    // Idle pooled connections die with the server. Without an 'error' listener on the pool, pg would
    // raise an unhandled 'error' event here and take the whole process (this test worker) down.
    server.restart();
    await until(async () => (await s.node("t1", "a").catch(() => undefined))?.id === "a", 15_000);
    await s.upsertNode(node("b"), 2);
    expect((await s.node("t1", "b"))?.id).toBe("b");
    expect(await s.history("t1", "a")).toHaveLength(1);
  });

  it("a store opened while the database is unreachable rejects instead of hanging", async () => {
    const pool = new pg.Pool({ connectionString: "postgres://postgres:x@127.0.0.1:1/postgres", connectionTimeoutMillis: 2_000 });
    await expect(gs.createPostgresGraphStore({ pool })).rejects.toThrow();
    await pool.end();
  });
});
