import type { DatabaseSync } from "node:sqlite";
import type { Doc } from "../model/types.js";
import { encodeTokens, tokenize } from "../text/tokenize.js";
import { writeTx } from "./tx.js";

const clear = (db: DatabaseSync, n: number): void => {
  db.prepare("DELETE FROM fts WHERE rowid = ?").run(n);
  db.prepare("DELETE FROM acl WHERE doc = ?").run(n);
  db.prepare("DELETE FROM links WHERE src = ?").run(n);
};

const put = (db: DatabaseSync, d: Doc): void => {
  const [t, p, b] = [tokenize(d.title), tokenize(d.path), tokenize(d.body)];
  const row = db
    .prepare(
      `INSERT INTO docs(id, path, mtime, lt, lp, lb) VALUES(?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET path = excluded.path, mtime = excluded.mtime, lt = excluded.lt, lp = excluded.lp, lb = excluded.lb
       RETURNING n`,
    )
    .get(d.id, d.path, d.mtimeMs, t.length, p.length, b.length) as { n: number };
  clear(db, row.n);
  db.prepare("INSERT INTO fts(rowid, t, p, b) VALUES(?, ?, ?, ?)").run(row.n, encodeTokens(t), encodeTokens(p), encodeTokens(b));
  for (const principal of d.principals) db.prepare("INSERT OR IGNORE INTO acl(principal, doc) VALUES(?, ?)").run(principal, row.n);
  for (const dst of d.links) if (dst !== d.id) db.prepare("INSERT OR IGNORE INTO links(dst, src) VALUES(?, ?)").run(dst, row.n);
};

/** Upsert by id in one transaction. The last duplicate in the batch wins. Returns distinct ids written. */
export const upsertDocs = (db: DatabaseSync, docs: readonly Doc[]): number => {
  const latest = [...new Map(docs.map((d) => [d.id, d])).values()];
  writeTx(db, () => {
    for (const d of latest) put(db, d);
  });
  return latest.length;
};

export const removeDocs = (db: DatabaseSync, ids: readonly string[]): number =>
  writeTx(db, () => {
    let removed = 0;
    for (const id of new Set(ids)) {
      const row = db.prepare("SELECT n FROM docs WHERE id = ?").get(id) as { n: number } | undefined;
      if (!row) continue;
      clear(db, row.n);
      db.prepare("DELETE FROM docs WHERE n = ?").run(row.n);
      removed++;
    }
    return removed;
  });
