import type { DatabaseSync } from "node:sqlite";

/** How an account's syncs are going: failed runs in a row, why the last one failed, and whether one is running now. */
export type Health = { failures: number; lastError: string | null; syncing: boolean };

/** Sync outcomes kept beside the account row. The running set is in memory: a restart ends every run, so it starts empty. */
export function openHealth(db: DatabaseSync) {
  const running = new Set<string>();
  const set = (sql: string, ...v: (string | number | null)[]) => void db.prepare(`UPDATE accounts SET ${sql} WHERE tenant = ? AND id = ?`).run(...v);
  return {
    read(tenant: string, id: string): Health {
      const r = db.prepare("SELECT fail_count, last_error FROM accounts WHERE tenant = ? AND id = ?").get(tenant, id) as
        | { fail_count: number; last_error: string | null }
        | undefined;
      return { failures: r?.fail_count ?? 0, lastError: r?.last_error ?? null, syncing: running.has(id) };
    },
    ok: (tenant: string, id: string): void => set("fail_count = 0, last_error = NULL", tenant, id),
    failed: (tenant: string, id: string, why: string): void => set("fail_count = fail_count + 1, last_error = ?", why, tenant, id),
    begin: (id: string): void => void running.add(id),
    end: (id: string): void => void running.delete(id),
  };
}
