import { randomBytes, randomUUID } from "node:crypto";
import pg from "pg";
import { createVault, loadKeyring, migrate } from "../../src/index.js";

export const skip = process.env["DATABASE_URL"] === undefined && process.env["CI"] === undefined;
export const hex = () => randomBytes(32).toString("hex");

/** A disposable database on real Postgres 16, migrated by the admin, used through a plain (non-superuser) role so row-level security applies. */
export async function database(keys = `k1:${hex()}`) {
  const url = process.env["DATABASE_URL"];
  if (url === undefined) throw new Error("DATABASE_URL must point to disposable Postgres 16");
  const admin = new pg.Pool({ connectionString: url, max: 1 });
  const version = await admin.query<{ server_version_num: string }>("SHOW server_version_num");
  if (!version.rows[0]?.server_version_num.startsWith("16")) throw new Error("Postgres 16 is required");
  const name = `cv_${randomUUID().replaceAll("-", "")}`;
  await admin.query(`CREATE DATABASE ${name}`);
  await admin.query(`CREATE ROLE ${name} LOGIN`);
  const at = (user: string) => {
    const u = new URL(url);
    u.pathname = `/${name}`;
    u.username = user;
    return new pg.Pool({ connectionString: u.toString(), max: 8 });
  };
  const owner = at("postgres");
  await migrate(owner, name);
  const pool = at(name);
  return {
    pool,
    owner,
    vault: createVault(pool, loadKeyring(keys)),
    withKeys: (k: string) => createVault(pool, loadKeyring(k)),
    close: async () => {
      await pool.end();
      await owner.end();
      await admin.query(`DROP DATABASE ${name} WITH (FORCE)`);
      await admin.query(`DROP ROLE ${name}`);
      await admin.end();
    },
  };
}
