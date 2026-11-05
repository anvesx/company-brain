import type { DatabaseSync } from "node:sqlite";
import { open } from "./rules/crypto.js";
import type { Kind } from "./types.js";

export type Secret = { id: string; tenant: string; owner: string; provider: string; kind: Kind; secret: string };

const readers = new WeakMap<object, () => Secret[]>();

/** Called once by `openStore`; ties the cross-tenant reader to the store object without putting it on the `Store` type. */
export const registerSecrets = (store: object, db: DatabaseSync, key: Buffer): void => {
  readers.set(store, () =>
    db
      .prepare("SELECT * FROM accounts WHERE status = 'active' ORDER BY seq")
      .all()
      .map((r) => ({
        id: r.id as string,
        tenant: r.tenant as string,
        owner: r.owner as string,
        provider: r.provider as string,
        kind: r.kind as Kind,
        secret: open(key, r.id as string, r.secret as string),
      })),
  );
};

/**
 * Every tenant's active credential, decrypted. Serves the token-file writer (`tokens/write-token-file.ts`) only and
 * must never be reachable from a request handler: it is the one read that crosses tenants. A test checks the import list.
 */
export function secretsOf(store: object): Secret[] {
  const read = readers.get(store);
  if (!read) throw new Error("not a store made by openStore");
  return read();
}
