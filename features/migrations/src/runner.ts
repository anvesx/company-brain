import { Kysely, PostgresDialect } from "kysely";
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

async function applied(pool: pg.Pool): Promise<VersionRow[]> {
  try {
    return (await pool.query<VersionRow>("SELECT version, checksum FROM schema_version")).rows;
  } catch (error) {
    if ((error as { code?: string }).code === "42P01") return [];
    throw error;
  }
}

async function verifyChecksums(pool: pg.Pool): Promise<void> {
  const expected = new Map(definitions.map((item) => [item.name, checksum(item)]));
  for (const row of await applied(pool)) {
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
  await verifyChecksums(pool);
  const schema = (await pool.query<{ name: string }>("SELECT current_schema() AS name")).rows[0]?.name;
  if (schema === undefined) throw new MigrationError("MIGRATION_FAILED", "the connection has no current schema");
  const db = new Kysely<Record<string, never>>({ dialect: new PostgresDialect({ pool }) });
  const result = await new Migrator({ db, provider, migrationTableSchema: schema }).migrateToLatest();
  if (result.error !== undefined) {
    const message = result.error instanceof Error ? result.error.message : String(result.error);
    throw new MigrationError("MIGRATION_FAILED", message, result.error);
  }
}
