import type { DatabaseSync, SQLInputValue } from "node:sqlite";
import type { Account, Kind, Status } from "./types.js";

export type Row = Record<string, SQLInputValue>;

export const SCHEMA = `CREATE TABLE IF NOT EXISTS accounts (
  id TEXT PRIMARY KEY, tenant TEXT NOT NULL, owner TEXT NOT NULL, provider TEXT NOT NULL, label TEXT NOT NULL,
  kind TEXT NOT NULL, access TEXT NOT NULL, data_zone TEXT NOT NULL, status TEXT NOT NULL, secret TEXT NOT NULL,
  seq INTEGER NOT NULL, repo TEXT, last_sync_at INTEGER)`;

/** Databases made before a column existed get it on open. */
export const migrate = (db: DatabaseSync): void => {
  const have = (db.prepare("PRAGMA table_info(accounts)").all() as { name: string }[]).map((c) => c.name);
  if (!have.includes("repo")) db.exec("ALTER TABLE accounts ADD COLUMN repo TEXT");
  if (!have.includes("last_sync_at")) db.exec("ALTER TABLE accounts ADD COLUMN last_sync_at INTEGER");
};

export const view = (r: Row): Account => ({
  id: r.id as string,
  tenant: r.tenant as string,
  owner: r.owner as string,
  provider: r.provider as string,
  label: r.label as string,
  kind: r.kind as Kind,
  access: r.access as Account["access"],
  dataZone: r.data_zone as Account["dataZone"],
  status: r.status as Status,
  repo: (r.repo as string | null) ?? null,
  lastSyncAt: (r.last_sync_at as number | null) ?? null,
});
