import { randomUUID } from "node:crypto";
import pg from "pg";

/** Skip only off-CI without Postgres (the commit hook runs under turbo, which drops DATABASE_URL); in CI it is a failure. */
export const skip = process.env["DATABASE_URL"] === undefined && process.env["CI"] === undefined;

/** One disposable database on real Postgres 16 per test file, so files never share rows. */
export async function database() {
  const url = process.env["DATABASE_URL"];
  if (url === undefined) throw new Error("DATABASE_URL must point to disposable Postgres 16");
  const admin = new pg.Pool({ connectionString: url, max: 1 });
  const version = await admin.query<{ server_version_num: string }>("SHOW server_version_num");
  if (!version.rows[0]?.server_version_num.startsWith("16")) throw new Error("Postgres 16 is required");
  const name = `gid_${randomUUID().replaceAll("-", "")}`;
  await admin.query(`CREATE DATABASE ${name}`);
  const own = new URL(url);
  own.pathname = `/${name}`;
  const pool = new pg.Pool({ connectionString: own.toString(), max: 5 });
  pool.on("error", () => {}); // DROP ... WITH (FORCE) may reset an idle client while the pool ends
  return {
    pool,
    close: async () => {
      await pool.end();
      await admin.query(`DROP DATABASE ${name} WITH (FORCE)`);
      await admin.end();
    },
  };
}
