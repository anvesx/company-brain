import { randomUUID } from "node:crypto";
import pg from "pg";

type TestDatabase = { pool: pg.Pool; useTenantRole: () => Promise<void>; close: () => Promise<void> };

export async function database(): Promise<TestDatabase> {
  const connectionString = process.env["DATABASE_URL"];
  if (connectionString === undefined) throw new Error("DATABASE_URL must point to disposable Postgres 16");
  const schema = `migrations_${randomUUID().replaceAll("-", "")}`;
  const role = `migrations_role_${randomUUID().replaceAll("-", "")}`;
  const admin = new pg.Pool({ connectionString });
  const version = await admin.query<{ server_version_num: string }>("SHOW server_version_num");
  if (!version.rows[0]?.server_version_num.startsWith("16")) throw new Error("Postgres 16 is required");
  await admin.query(`CREATE SCHEMA ${schema}`);
  await admin.query(`CREATE ROLE ${role} NOLOGIN`);
  const pool = new pg.Pool({ connectionString, max: 1, options: `-c search_path=${schema}` });
  return {
    pool,
    useTenantRole: async () => {
      await pool.query(`GRANT USAGE ON SCHEMA ${schema} TO ${role}`);
      await pool.query(`GRANT SELECT, INSERT ON ALL TABLES IN SCHEMA ${schema} TO ${role}`);
      await pool.query(`SET ROLE ${role}`);
    },
    close: async () => {
      await pool.end();
      await admin.query(`DROP SCHEMA ${schema} CASCADE`);
      await admin.query(`DROP ROLE ${role}`);
      await admin.end();
    },
  };
}

export async function graphStoreShape(pool: pg.Pool): Promise<void> {
  await pool.query(`CREATE TABLE nodes (
    seq bigint GENERATED ALWAYS AS IDENTITY, tenant text NOT NULL, id text NOT NULL, kind text NOT NULL,
    source text NOT NULL, address text NOT NULL, title text NOT NULL, version text NOT NULL, props text NOT NULL,
    valid_from double precision NOT NULL, valid_to double precision
  )`);
  await pool.query(`CREATE TABLE edges (
    seq bigint GENERATED ALWAYS AS IDENTITY, tenant text NOT NULL, from_id text NOT NULL, to_id text NOT NULL,
    kind text NOT NULL, source text NOT NULL, valid_from double precision NOT NULL, valid_to double precision
  )`);
  await pool.query("CREATE UNIQUE INDEX nodes_current ON nodes (tenant, id) WHERE valid_to IS NULL");
  await pool.query("CREATE UNIQUE INDEX edges_current ON edges (tenant, from_id, to_id, kind) WHERE valid_to IS NULL");
  await pool.query(`INSERT INTO nodes (tenant, id, kind, source, address, title, version, props, valid_from)
    VALUES ('legacy', 'node:1', 'document', 'drive', 'files/1', 'Legacy', '1', '{}', 1)`);
}
