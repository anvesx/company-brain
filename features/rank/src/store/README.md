# store

Everything that touches SQLite (`node:sqlite`, FTS5).

- `schema.ts`: DDL, `openDb`, and `VISIBLE`, the ACL sub-select.
- `tx.ts`: `readTx` (deferred transaction, so a WAL snapshot) and `writeTx` (`BEGIN IMMEDIATE`, `ROLLBACK` on any error).
- `write.ts`: `upsertDocs` and `removeDocs`.
- `read.ts`: the four read statements: visible statistics, postings, metadata, inbound links.

## Tables

| Table                                  | Holds                                                                                                                                                              |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `docs(n, id, path, mtime, lt, lp, lb)` | The pointer (id, path), the mtime, and three token counts. No text.                                                                                                |
| `acl(principal, doc)`                  | One row per principal allowed to read a doc.                                                                                                                       |
| `links(dst, src)`                      | Outgoing links, stored by source doc.                                                                                                                              |
| `fts`                                  | Contentless FTS5 table (`content=''`, `contentless_delete=1`, `detail=full`) with columns `t`, `p`, `b`. It stores postings of hex-encoded tokens, never the text. |
| `vocab`                                | `fts5vocab(fts, 'instance')`, which exposes (term, doc, column, offset) rows for term-frequency counting.                                                          |

## ACL as a pre-filter

Every read statement contains `doc IN (SELECT doc FROM acl WHERE principal IN (SELECT value FROM json_each(:p)))`. Statistics, postings, metadata and link counts are all computed inside that set. Nothing is ranked first and trimmed after, so a hidden doc cannot change a visible doc's score, the result count or the order.

## Transactions

Search runs in one deferred read transaction, so it sees a single consistent snapshot. An index call is one `BEGIN IMMEDIATE` transaction: a reader sees all of a batch or none of it. Pragmas: WAL, `synchronous = NORMAL`, `busy_timeout = 5000`.
