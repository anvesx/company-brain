# scripts

k6 scripts (plain JavaScript run by the k6 binary, not by Node).

- `catalog.js`: `GET /v1/catalog`; needs `BASE` and `TOKEN`.
- `thresholds.js`: the p95, error-rate, check-rate and dropped-iteration limits.

`bin/run.mjs` supplies the environment. `RATE` and `DURATION` override the defaults. The rank script moved to the rag repo.
