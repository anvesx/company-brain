# many

The Postgres batch reads. `many.ts`: `manyOps(pool)` gives `nodesOf` and `edgesOf`, one `= ANY($n::text[])` query each, with the same validation as the SQLite version in `../../edges/many.ts`.
