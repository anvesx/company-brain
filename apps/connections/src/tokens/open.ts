import { createVault, loadKeyring, migrate, type Vault } from "@anvesx/connector-vault";
import type pg from "pg";
import type { Store } from "../accounts/store.js";
import type { Account, NewAccount } from "../accounts/types.js";

/** Creates the vault table when absent (one replica at a time) and opens the vault. `keys` is `kid:hex64,...` (see connector-vault); it must differ from the auth secret. */
export async function openVault(pool: pg.Pool, keys: string | undefined, authSecret: string): Promise<Vault> {
  const ring = loadKeyring(keys, authSecret);
  const c = await pool.connect();
  try {
    await c.query("SELECT pg_advisory_lock(7320032)"); // replicas booting together must not race on CREATE TABLE
    await migrate(pool);
  } finally {
    await c.query("SELECT pg_advisory_unlock(7320032)");
    c.release();
  }
  return createVault(pool, ring);
}

/** The account row and its sealed token, together: a vault failure removes the row again so no account is left without a credential. */
export async function createWithToken(
  d: { store: Store; vault: Vault },
  a: NewAccount,
  token: { accessToken: string; refreshToken?: string; expiresAt?: Date | null },
): Promise<Account> {
  const made = d.store.create(a);
  const { expiresAt, ...sealed } = token;
  try {
    await d.vault.put(made.tenant, { id: made.id, owner: made.owner, provider: made.provider, token: sealed, expiresAt: expiresAt ?? null });
  } catch (e) {
    d.store.remove(made.tenant, made.id);
    throw e;
  }
  return made;
}
