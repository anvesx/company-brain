import { Kysely, PostgresDialect } from "kysely";
import { Migrator } from "kysely/migration";
import type pg from "pg";
import { provider } from "../../../src/migrations/index.js";

async function migrator(pool: pg.Pool): Promise<Migrator> {
  const schema = (await pool.query<{ name: string }>("SELECT current_schema() AS name")).rows[0]?.name;
  if (schema === undefined) throw new Error("No current schema");
  const db = new Kysely<Record<string, never>>({ dialect: new PostgresDialect({ pool }) });
  return new Migrator({ db, provider, migrationTableSchema: schema });
}

function assertOk(result: { error?: unknown }): void {
  if (result.error !== undefined) throw result.error;
}

/** Reverts the newest applied migration through its real down(). */
export async function migrateDown(pool: pg.Pool): Promise<void> {
  assertOk(await (await migrator(pool)).migrateDown());
}

/** Applies the real migrations up to and including `name`, so stored checksums are genuine. */
export async function migrateOnlyTo(pool: pg.Pool, name: string): Promise<void> {
  assertOk(await (await migrator(pool)).migrateTo(name));
}
