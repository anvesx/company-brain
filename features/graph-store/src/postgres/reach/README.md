# reach

`reach.ts`: the breadth-first walk over current outgoing edges for Postgres. Same rules as the SQLite walk, but two queries per level (`= ANY($n)`) instead of paged reads.
