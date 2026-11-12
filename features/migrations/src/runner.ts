import { Kysely, PostgresDialect, sql, type Transaction } from "kysely";
import { Migrator } from "kysely/migration";
import type pg from "pg";
import { checksum } from "./checksum.js";
import { definitions, provider } from "./migrations/index.js";

export type MigrationErrorCode = "CHECKSUM_MISMATCH" | "MIGRATION_FAILED" | "VERSION_MISSING";

export class MigrationError extends Error {
  readonly code: MigrationErrorCode;

  constructor(code: MigrationErrorCode, message: string, cause?: unknown) {
    super(message, cause === undefined ? undefined : { cause });
    this.name = "MigrationError";
    this.code = code;
  }
}

type VersionRow = { version: string; checksum: string };
type Db = Transaction<Record<string, never>>;

/** Serialises every migrate() caller; held until the surrounding transaction ends. */
export const MIGRATE_LOCK_KEY = 7_450_218_331;

async function applied(trx: Db): Promise<VersionRow[]> {
  const present = await sql<{ found: boolean }>`SELECT to_regclass('schema_version') IS NOT NULL AS found`.execute(trx);
  if (present.rows[0]?.found !== true) return [];
  return (await sql<VersionRow>`SELECT version, checksum FROM schema_version`.execute(trx)).rows;
}

async function verifyChecksums(trx: Db): Promise<void> {
  const expected = new Map(definitions.map((item) => [item.name, checksum(item)]));
  for (const row of await applied(trx)) {
    const actual = expected.get(row.version);
    if (actual === undefined) {
      throw new MigrationError("VERSION_MISSING", `applied migration ${row.version} is absent from this build`);
    }
    if (actual !== row.checksum) {
      throw new MigrationError("CHECKSUM_MISMATCH", `applied migration ${row.version} was edited`);
    }
  }
}

export async function migrate(pool: pg.Pool): Promise<void> {
  const db = new Kysely<Record<string, never>>({ dialect: new PostgresDialect({ pool }) });
  await db.transaction().execute(async (trx) => {
    await sql`SELECT pg_advisory_xact_lock(${sql.lit(MIGRATE_LOCK_KEY)})`.execute(trx);
    await verifyChecksums(trx);
    const row = (await sql<{ name: string | null }>`SELECT current_schema() AS name`.execute(trx)).rows[0];
    if (row?.name === undefined || row.name === null) {
      throw new MigrationError("MIGRATION_FAILED", "the connection has no current schema");
    }
    const result = await new Migrator({ db: trx, provider, migrationTableSchema: row.name }).migrateToLatest();
    if (result.error !== undefined) {
      const message = result.error instanceof Error ? result.error.message : String(result.error);
      throw new MigrationError("MIGRATION_FAILED", message, result.error);
    }
  });
}
