import { chmodSync, renameSync, writeFileSync } from "node:fs";
import type { Store } from "../accounts/store.js";
import { accessTokenOf } from "./access-token.js";

/** Writes `BRAIN_USER_TOKENS_FILE`: `{user: {source: token}}`, mode 600, replaced atomically. Each owner's oldest active account per provider wins. */
export function writeTokenFile(store: Store, file: string): { users: number; tokens: number } {
  const out: Record<string, Record<string, string>> = {};
  let tokens = 0;
  for (const s of store.secrets()) {
    const token = accessTokenOf(s.kind, s.secret);
    const mine = out[s.owner] ?? {};
    if (token === undefined || s.provider in mine) continue;
    out[s.owner] = { ...mine, [s.provider]: token };
    tokens++;
  }
  const tmp = `${file}.${process.pid}.tmp`;
  writeFileSync(tmp, `${JSON.stringify(out, null, 2)}\n`, { mode: 0o600 });
  chmodSync(tmp, 0o600);
  renameSync(tmp, file);
  return { users: Object.keys(out).length, tokens };
}
