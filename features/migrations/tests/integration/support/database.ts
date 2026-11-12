import { randomUUID } from "node:crypto";
import pg from "pg";

export type TestDatabase = {
  pools: pg.Pool[];
  pool: pg.Pool;
  useTenantRole: () => Promise<void>;
  close: () => Promise<void>;
};

/** Skip only off-CI without Postgres (the commit hook runs under turbo, which drops DATABASE_URL); in CI it is a failure. */
export const skip = process.env["DATABASE_URL"] === undefined && process.env["CI"] === undefined;

const unique = (prefix: string): string => `${prefix}_${randomUUID().replaceAll("-", "")}`;

/**
 * One disposable database (so parallel test files never race each other's catalog scans or drops)
 * on real Postgres 16, with one schema, reached through `count` single-connection pools.
 */
export async function database(count = 1): Promise<TestDatabase> {
  const connectionString = process.env["DATABASE_URL"];
  if (connectionString === undefined) throw new Error("DATABASE_URL must point to disposable Postgres 16");
  const schema = unique("migrations");
  const name = unique("migrations_db");
  const role = unique("migrations_role");
  const admin = new pg.Pool({ connectionString });
  const version = await admin.query<{ server_version_num: string }>("SHOW server_version_num");
  if (!version.rows[0]?.server_version_num.startsWith("16")) throw new Error("Postgres 16 is required");
  await admin.query(`CREATE DATABASE ${name}`);
  await admin.query(`CREATE ROLE ${role} NOLOGIN`);
  const own = new URL(connectionString);
  own.pathname = `/${name}`;
  const setup = new pg.Client({ connectionString: own.toString() });
  await setup.connect();
  await setup.query(`CREATE SCHEMA ${schema}`);
  await setup.end();
  const pools = Array.from({ length: count }, () => new pg.Pool({ connectionString: own.toString(), max: 1, options: `-c search_path=${schema}` }));
  const pool = pools[0] as pg.Pool;
  return {
    pools,
    pool,
    useTenantRole: async () => {
      await pool.query(`GRANT USAGE ON SCHEMA ${schema} TO ${role}`);
      await pool.query(`GRANT SELECT, INSERT ON ALL TABLES IN SCHEMA ${schema} TO ${role}`);
      await pool.query(`SET ROLE ${role}`);
    },
    close: async () => {
      await Promise.all(pools.map((p) => p.end()));
      await admin.query(`DROP DATABASE ${name} WITH (FORCE)`);
      await admin.query(`DROP ROLE ${role}`);
      await admin.end();
    },
  };
}
