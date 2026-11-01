# SQLite search layer

`index-db.ts` owns transactions and validation. `fts.ts` owns FTS5 storage and
ranking. `vec.ts` owns sqlite-vec storage and L2 ranking, with an exact scan fallback past the 4096 knn cap. ACL fragments join
through `chunks` and run in each SQL query before its `ORDER BY` ranking step.

`chunks` holds `allow_users` and `allow_groups` JSON columns for acl-filter. Rankers return chunk rowids, which `db.ts` hydrates to chunk and doc ids.
