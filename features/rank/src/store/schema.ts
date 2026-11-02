import { DatabaseSync } from "node:sqlite";

/**
 * docs: pointer plus per-column token counts. No title or body.
 * fts: contentless, so FTS5 keeps postings only. detail=full keeps positions for fts5vocab 'instance'.
 * acl and links are plain tables; acl is keyed principal-first so the ACL pre-filter is an index range scan.
 */
const DDL = `
CREATE TABLE IF NOT EXISTS docs(n INTEGER PRIMARY KEY, id TEXT NOT NULL UNIQUE, path TEXT NOT NULL, mtime REAL NOT NULL,
  lt INTEGER NOT NULL, lp INTEGER NOT NULL, lb INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS acl(principal TEXT NOT NULL, doc INTEGER NOT NULL, PRIMARY KEY(principal, doc)) WITHOUT ROWID;
CREATE INDEX IF NOT EXISTS acl_doc ON acl(doc);
CREATE TABLE IF NOT EXISTS links(dst TEXT NOT NULL, src INTEGER NOT NULL, PRIMARY KEY(dst, src)) WITHOUT ROWID;
CREATE INDEX IF NOT EXISTS links_src ON links(src);
CREATE VIRTUAL TABLE IF NOT EXISTS fts USING fts5(t, p, b, content='', contentless_delete=1, detail=full, tokenize='ascii');
CREATE VIRTUAL TABLE IF NOT EXISTS vocab USING fts5vocab(fts, 'instance');
`;

/** Documents the asker may read. Bound as :p, a JSON array of principals. Every read statement embeds this. */
export const VISIBLE = "SELECT doc FROM acl WHERE principal IN (SELECT value FROM json_each(:p))";

export const openDb = (file: string): DatabaseSync => {
  const db = new DatabaseSync(file);
  db.exec("PRAGMA busy_timeout = 5000");
  db.exec("PRAGMA journal_mode = WAL");
  db.exec("PRAGMA synchronous = NORMAL");
  db.exec(DDL);
  return db;
};
