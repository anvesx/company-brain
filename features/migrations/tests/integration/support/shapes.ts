import type pg from "pg";

/** The nodes/edges tables graph-store creates today, plus one legacy row. */
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

export const tableCount = async (pool: pg.Pool): Promise<string | undefined> =>
  (
    await pool.query<{ count: string }>(
      "SELECT count(*) FROM information_schema.tables WHERE table_schema = current_schema() AND table_name NOT LIKE 'kysely_%'",
    )
  ).rows[0]?.count;

export const versions = async (pool: pg.Pool): Promise<string[]> =>
  (await pool.query<{ version: string }>("SELECT version FROM schema_version ORDER BY version")).rows.map((row) => row.version);
