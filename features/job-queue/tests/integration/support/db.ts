import { randomUUID } from "node:crypto";
import pg from "pg";

/** Skip only off-CI without Postgres; in CI a missing DATABASE_URL is a failure, as in features/migrations. */
export const skip = process.env["DATABASE_URL"] === undefined && process.env["CI"] === undefined;

export type TestDb = { url: string; pool: pg.Pool; close: () => Promise<void> };

/** One disposable database on the real Postgres 16, so test files never share queue tables. */
export async function freshDatabase(): Promise<TestDb> {
  const base = process.env["DATABASE_URL"];
  if (base === undefined) throw new Error("DATABASE_URL must point to disposable Postgres 16");
  const name = `jq_${randomUUID().replaceAll("-", "")}`;
  const admin = new pg.Pool({ connectionString: base, max: 1 });
  const version = await admin.query<{ server_version_num: string }>("SHOW server_version_num");
  if (!version.rows[0]?.server_version_num.startsWith("16")) throw new Error("Postgres 16 is required");
  await admin.query(`CREATE DATABASE ${name}`);
  const own = new URL(base);
  own.pathname = `/${name}`;
  const pool = new pg.Pool({ connectionString: own.toString(), max: 3 });
  await pool.query("CREATE TABLE runs (job_id text NOT NULL, attempt int NOT NULL, event text NOT NULL, at timestamptz NOT NULL DEFAULT now())");
  const close = async () => {
    await pool.end();
    await admin.query(`DROP DATABASE ${name} WITH (FORCE)`);
    await admin.end();
  };
  return { url: own.toString(), pool, close };
}
