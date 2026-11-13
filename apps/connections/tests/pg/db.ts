import { join } from "node:path";
import { createCursorStore } from "@anvesx/change-cursor";
import pg from "pg";
import { openVault } from "../../src/tokens/open.js";

export const KEYS = `k1:${"ab".repeat(32)}`;
/** The bearer secret the harnesses sign with; the vault refuses a key equal to it. */
export const AUTH = "s".repeat(32);

export const databaseUrl = (): string => {
  const url = process.env["DATABASE_URL"];
  if (!url) throw new Error("DATABASE_URL must point to a disposable Postgres 16");
  return url;
};

/** The real vault on the shared Postgres and a real cursor file in `dir`. `close()` ends the pool and the file. */
export async function data(dir: string, nowMs: () => number) {
  const pool = new pg.Pool({ connectionString: databaseUrl() });
  const vault = await openVault(pool, KEYS, AUTH);
  const cursors = createCursorStore(join(dir, "cursors.db"), nowMs);
  return {
    vault,
    cursors,
    close: async () => {
      cursors.close();
      await pool.end();
    },
  };
}

/** The two settings every launcher test needs besides its own paths. */
export const dataEnv = () => ({ CONNECTIONS_DATABASE_URL: databaseUrl(), CONNECTOR_VAULT_KEYS: KEYS });
