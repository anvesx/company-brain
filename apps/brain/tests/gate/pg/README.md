# gate on real Postgres

- `pg.test.ts`: the shared gate over the Postgres graph store: fail closed, zones, live recheck, owner-only readers (leak 4).
- `scale.test.ts`: gate latency on an edges table of `BRAIN_GATE_EDGES` rows (default 200,000; set 10000000 for the 10M-edge run) with `EXPLAIN ANALYZE` of the readers lookup.

Both start a throwaway Postgres (`PG_BIN` points at the binaries) and skip when none is found, unless `CI=true`.
