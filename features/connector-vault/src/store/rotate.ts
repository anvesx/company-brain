import { open, seal } from "../seal/seal.js";
import { inTenant } from "./tenant.js";
import type { Vault } from "./vault.js";

type Row = { id: string; sealed: string };

/**
 * Re-seals every row not under the current key, in id order, `batch` rows per transaction with row locks.
 * Readers keep working throughout: each row opens under its own key id until it is moved.
 * Rows locked by a refresh are skipped; `remaining` says how many are left, so run again until it is 0, then drop the old key.
 */
export async function rotate(vault: Vault, batch = 500): Promise<{ rotated: number; remaining: number }> {
  const { pool, ring } = vault;
  let rotated = 0;
  let after = "";
  for (;;) {
    const n = await inTenant(pool, "sweeper", async (c) => {
      const { rows } = await c.query<Row>("SELECT id, sealed FROM connector_tokens WHERE kid <> $1 AND id > $2 ORDER BY id LIMIT $3 FOR UPDATE SKIP LOCKED", [
        ring.current.kid,
        after,
        batch,
      ]);
      for (const r of rows) {
        await c.query("UPDATE connector_tokens SET kid = $2, sealed = $3, updated_at = now() WHERE id = $1", [
          r.id,
          ring.current.kid,
          seal(ring, r.id, open(ring, r.id, r.sealed)),
        ]);
      }
      after = rows.at(-1)?.id ?? after;
      return rows.length;
    });
    rotated += n;
    if (n < batch) break;
  }
  const remaining = await inTenant(pool, "sweeper", async (c) =>
    Number((await c.query<{ n: string }>("SELECT count(*) AS n FROM connector_tokens WHERE kid <> $1", [ring.current.kid])).rows[0]?.n),
  );
  return { rotated, remaining };
}
