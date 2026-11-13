import { randomUUID } from "node:crypto";
import { DatabaseSync } from "node:sqlite";
import { openHealth } from "./health/health.js";
import { migrate, type Row, SCHEMA, view } from "./rows.js";
import type { Account, Caller, NewAccount, Patch, Status } from "./types.js";

/** Account rows on `node:sqlite`. Credentials are not here: they live in the token vault (`tokens/`). */
export function openStore(path: string) {
  const db = new DatabaseSync(path);
  db.exec(SCHEMA);
  migrate(db);
  // Every lookup carries the tenant: a wrong tenant finds nothing, exactly like an unknown id, so ids cannot be probed across tenants.
  const row = (tenant: string, id: string) => db.prepare("SELECT * FROM accounts WHERE id = ? AND tenant = ?").get(id, tenant) as Row | undefined;
  const store = {
    create(a: NewAccount): Account {
      const id = randomUUID();
      const seq = (db.prepare("SELECT COALESCE(MAX(seq), 0) + 1 AS n FROM accounts").get() as { n: number }).n;
      const sql = "INSERT INTO accounts (id,tenant,owner,provider,label,kind,access,data_zone,status,seq,repo) VALUES (?,?,?,?,?,?,?,?,?,?,?)";
      const cols = [id, a.tenant, a.owner, a.provider, a.label, a.kind, a.access, a.dataZone, "active", seq, a.repo ?? null];
      db.prepare(sql).run(...cols);
      return view(row(a.tenant, id) as Row);
    },
    get: (tenant: string, id: string): Account | undefined => {
      const r = row(tenant, id);
      return r && view(r);
    },
    /** The caller's own oauth account for this app and label, so signing in again renews it instead of adding a twin. */
    findOauth(tenant: string, owner: string, provider: string, label: string): Account | undefined {
      const r = db
        .prepare("SELECT * FROM accounts WHERE tenant = ? AND owner = ? AND provider = ? AND label = ? AND kind = 'oauth' ORDER BY seq")
        .get(tenant, owner, provider, label);
      return r && view(r as Row);
    },
    listVisible: (c: Caller): Account[] =>
      db
        .prepare("SELECT * FROM accounts WHERE tenant = ? AND (owner = ? OR access = 'company') ORDER BY seq")
        .all(c.tenant, c.user)
        .map((r) => view(r as Row)),
    update(tenant: string, id: string, p: Patch): Account | undefined {
      const cur = row(tenant, id);
      if (!cur) return undefined;
      const next = {
        label: p.label ?? cur.label,
        access: p.access ?? cur.access,
        data_zone: p.dataZone ?? cur.data_zone,
        repo: p.repo === undefined ? cur.repo : p.repo,
      };
      // row() above already checked the tenant; the predicate here is a second guard, not the only one.
      db.prepare("UPDATE accounts SET label = ?, access = ?, data_zone = ?, repo = ? WHERE id = ? AND tenant = ?").run(
        next.label as string,
        next.access as string,
        next.data_zone as string,
        next.repo as string | null,
        id,
        tenant,
      );
      return view(row(tenant, id) as Row);
    },
    setLastSync: (tenant: string, id: string, ms: number): void =>
      void db.prepare("UPDATE accounts SET last_sync_at = ? WHERE id = ? AND tenant = ?").run(ms, id, tenant),
    setStatus: (tenant: string, id: string, s: Status): void =>
      void db.prepare("UPDATE accounts SET status = ? WHERE id = ? AND tenant = ?").run(s, id, tenant),
    remove: (tenant: string, id: string): boolean => Number(db.prepare("DELETE FROM accounts WHERE id = ? AND tenant = ?").run(id, tenant).changes) > 0,
    /** Active accounts of every tenant, ids only (never a credential), for the background jobs; `repo` narrows to the accounts that name it. */
    active: (repo?: string): { tenant: string; id: string; provider: string }[] =>
      db
        .prepare("SELECT tenant, id, provider FROM accounts WHERE status = 'active' AND (? IS NULL OR (provider = 'github' AND repo = ?)) ORDER BY seq")
        .all(repo ?? null, repo ?? null) as { tenant: string; id: string; provider: string }[],
    health: openHealth(db),
    close: (): void => db.close(),
  };
  return store;
}
export type Store = ReturnType<typeof openStore>;
