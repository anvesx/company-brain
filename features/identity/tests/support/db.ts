import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { DatabaseSync, SQLInputValue } from "node:sqlite";
import { openSqlite } from "../../src/index.js";

export type Row = Record<string, unknown>;
export const MINUTE = 60_000;
export const DAY = 24 * 60 * MINUTE;

/** A fresh SQLite file in its own temp folder; never a shared path. */
export const tempDbPath = (): string => join(mkdtempSync(join(tmpdir(), "identity-")), "auth.sqlite");

/** Opened with the same pragmas the app uses (graph-store openDb): WAL + NORMAL, so timings here mean something. */
export const openDb = (path: string = tempDbPath()): DatabaseSync => {
  // `openSqlite` sets the busy timeout; the app's other pragmas follow.
  const db = openSqlite(path);
  db.exec("PRAGMA journal_mode = WAL; PRAGMA synchronous = NORMAL;");
  return db;
};

export const rows = (db: DatabaseSync, sql: string, ...args: SQLInputValue[]): Row[] => db.prepare(sql).all(...args) as Row[];

export const one = (db: DatabaseSync, sql: string, ...args: SQLInputValue[]): Row => {
  const row = rows(db, sql, ...args)[0];
  if (row === undefined) throw new Error(`no row for: ${sql}`);
  return row;
};

export const count = (db: DatabaseSync, sql: string, ...args: SQLInputValue[]): number => Number(one(db, sql, ...args)["n"]);

/** Reads a stored timestamp as epoch ms whether the adapter wrote a number or a date string. */
export const toMs = (value: unknown): number => (typeof value === "number" ? value : Date.parse(String(value)));

/** Moves one stored timestamp by `deltaMs`, keeping the adapter's storage type. */
export const shiftTime = (db: DatabaseSync, table: string, column: string, id: string, deltaMs: number): void => {
  const current = one(db, `select "${column}" as v from "${table}" where id = ?`, id)["v"];
  const next = toMs(current) + deltaMs;
  const value = typeof current === "number" ? next : new Date(next).toISOString();
  db.prepare(`update "${table}" set "${column}" = ? where id = ?`).run(value, id);
};
