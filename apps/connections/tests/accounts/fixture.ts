import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { parseKey } from "../../src/accounts/rules/crypto.js";
import { openStore, type Store } from "../../src/accounts/store.js";

export const key = parseKey("ab".repeat(32));
export const input = {
  tenant: "t1",
  owner: "ann",
  provider: "github",
  label: "work",
  kind: "pat",
  access: "private",
  dataZone: "private",
  secret: "ghp_one",
} as const;

/** A real SQLite file in a temp directory; `done()` closes it and removes the directory. */
export function tempStore(): { path: string; store: Store; done: () => void } {
  const dir = mkdtempSync(join(tmpdir(), "conn-"));
  const path = join(dir, "c.db");
  const store = openStore(path, key);
  return {
    path,
    store,
    done: () => {
      store.close();
      rmSync(dir, { recursive: true, force: true });
    },
  };
}
