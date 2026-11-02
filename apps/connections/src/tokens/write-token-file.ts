import { chmodSync, renameSync, writeFileSync } from "node:fs";
import type { Store } from "../accounts/store.js";
import { sourceOf } from "../sync/connector.js";
import { accessTokenOf } from "./access-token.js";
import { userKey } from "./user-key.js";

/**
 * Writes `BRAIN_USER_TOKENS_FILE`: `{"tenant:user": {source: token}}` (parts encoded by `userKey`), mode 600, replaced atomically.
 * Each active account is keyed by its graph source `<provider>:<id>`, which is what a synced document carries in `source`.
 * Each owner's oldest active account per provider is also keyed by the bare provider (`github`, `drive`), the id `brain sync` uses.
 */
export function writeTokenFile(store: Store, file: string): { users: number; tokens: number } {
  const out: Record<string, Record<string, string>> = {};
  let tokens = 0;
  for (const s of store.secrets()) {
    const token = accessTokenOf(s.kind, s.secret);
    if (token === undefined) continue;
    const who = userKey(s.tenant, s.owner);
    const mine = out[who] ?? {};
    out[who] = { ...mine, ...(s.provider in mine ? {} : { [s.provider]: token }), [sourceOf(s)]: token };
    tokens++;
  }
  const tmp = `${file}.${process.pid}.tmp`;
  writeFileSync(tmp, `${JSON.stringify(out, null, 2)}\n`, { mode: 0o600 });
  chmodSync(tmp, 0o600);
  renameSync(tmp, file);
  return { users: Object.keys(out).length, tokens };
}
