import type { DatabaseSync, SQLInputValue } from "node:sqlite";
import type { Account, Kind, Status } from "./types.js";

export type Row = Record<string, SQLInputValue>;

export const SCHEMA = `CREATE TABLE IF NOT EXISTS accounts (
  id TEXT PRIMARY KEY, tenant TEXT NOT NULL, owner TEXT NOT NULL, provider TEXT NOT NULL, label TEXT NOT NULL,
  kind TEXT NOT NULL, access TEXT NOT NULL, data_zone TEXT NOT NULL, status TEXT NOT NULL, secret TEXT NOT NULL,
  seq INTEGER NOT NULL, repo TEXT)`;
/** Databases made before `repo` existed get the column on open. */
export const migrate = (db: DatabaseSync): void => {
  const has = (db.prepare("PRAGMA table_info(accounts)").all() as { name: string }[]).some((c) => c.name === "repo");
  if (!has) db.exec("ALTER TABLE accounts ADD COLUMN repo TEXT");
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
});
