import { randomUUID } from "node:crypto";
import { DatabaseSync } from "node:sqlite";
import { migrate, type Row, SCHEMA, view } from "./rows.js";
import { open, seal } from "./rules/crypto.js";
import type { Account, Caller, Kind, NewAccount, Patch, Status } from "./types.js";

export type Secret = { id: string; owner: string; provider: string; kind: Kind; secret: string };
export function openStore(path: string, key: Buffer) {
  const db = new DatabaseSync(path);
  db.exec(SCHEMA);
  migrate(db);
  const get = (id: string) => db.prepare("SELECT * FROM accounts WHERE id = ?").get(id) as Row | undefined;
  return {
    create(a: NewAccount): Account {
      const id = randomUUID();
      const seq = (db.prepare("SELECT COALESCE(MAX(seq), 0) + 1 AS n FROM accounts").get() as { n: number }).n;
      const sql = "INSERT INTO accounts (id,tenant,owner,provider,label,kind,access,data_zone,status,secret,seq,repo) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)";
      const cols = [id, a.tenant, a.owner, a.provider, a.label, a.kind, a.access, a.dataZone, "active", seal(key, id, a.secret), seq, a.repo ?? null];
      db.prepare(sql).run(...cols);
      return view(get(id) as Row);
    },
    get: (id: string): Account | undefined => {
      const r = get(id);
      return r && view(r);
    },
    listVisible: (c: Caller): Account[] =>
      db
        .prepare("SELECT * FROM accounts WHERE tenant = ? AND (owner = ? OR access = 'company') ORDER BY seq")
        .all(c.tenant, c.user)
        .map((r) => view(r as Row)),
    update(id: string, p: Patch): Account | undefined {
      const cur = get(id);
      if (!cur) return undefined;
      const next = {
        label: p.label ?? cur.label,
        access: p.access ?? cur.access,
        data_zone: p.dataZone ?? cur.data_zone,
        repo: p.repo === undefined ? cur.repo : p.repo,
      };
      db.prepare("UPDATE accounts SET label = ?, access = ?, data_zone = ?, repo = ? WHERE id = ?").run(
        next.label as string,
        next.access as string,
        next.data_zone as string,
        next.repo as string | null,
        id,
      );
      return view(get(id) as Row);
    },
    setLastSync: (id: string, ms: number): void => void db.prepare("UPDATE accounts SET last_sync_at = ? WHERE id = ?").run(ms, id),
    setStatus: (id: string, s: Status): void => void db.prepare("UPDATE accounts SET status = ? WHERE id = ?").run(s, id),
    setCredential: (id: string, secret: string): void => void db.prepare("UPDATE accounts SET secret = ? WHERE id = ?").run(seal(key, id, secret), id),
    remove: (id: string): boolean => Number(db.prepare("DELETE FROM accounts WHERE id = ?").run(id).changes) > 0,
    credential(id: string): string | undefined {
      const r = get(id);
      return r && open(key, id, r.secret as string);
    },
    secrets: (): Secret[] =>
      db
        .prepare("SELECT * FROM accounts WHERE status = 'active' ORDER BY seq")
        .all()
        .map((r) => ({
          id: r.id as string,
          owner: r.owner as string,
          provider: r.provider as string,
          kind: r.kind as Kind,
          secret: open(key, r.id as string, r.secret as string),
        })),
    close: (): void => db.close(),
  };
}
export type Store = ReturnType<typeof openStore>;
