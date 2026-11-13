# src/db

The SQL of the screen. Plain parameterised text over the graph-store `nodes` and `edges` tables. No ORM.

- `list.ts`: `listSql`, the one file-listing query. Tenant-scoped, filtered, keyset only, with a can-read prefilter.
- `clusters.ts`: cluster tree level, detail, recursive subtree (depth 8), per-cluster members, membership of a page of files.
- `cursor.ts`: opaque base64url cursor and `BadInput` (HTTP 400).
- `migrate.ts`: `fv_prop` / `fv_num` / `fv_ts` helpers and the `fv_*` partial indexes, created under an advisory lock. Safe to repeat.

The prefilter only narrows candidates. The permission gate in `../gate` decides what a viewer sees.
