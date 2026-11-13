# WP-10 evidence: one permission gate

Branch `wp/10-permission-gate`, 2026-11-13. Postgres 16 at `/opt/homebrew/opt/postgresql@16/bin`.

## Result

Every read route (`/v1/documents`, `/v1/graph` and time-travel, MCP search, node and graph) now goes through
`openGate` in `features/visibility/src/gate.ts`. The live source check runs on every read. A missing check, a
throw, a timeout or `false` hides the document. `asOf` selects node versions only; permissions are always current.
The old `apps/brain/src/gate/access.ts` and the copies in graph-view and brain-mcp are deleted.

## Leaks (section 9 of the plan)

| # | Leak | Test |
|---|------|------|
| 1 | Document shown with no live check | `apps/brain/tests/gate/leaks.test.ts`, `modules/graph-view/tests/unit/leaks/gate.test.ts`, `apps/brain/tests/gate/pg/pg.test.ts` |
| 2 | Source says no, graph says yes | same three |
| 3 | Another person's personal zone, or a document with no zone | same three, plus `apps/brain/tests/gate/zone.test.ts` (matches zone-policy) |
| 4 | Co-readers shown to a non-owner | same three |
| 5 | `asOf` reads old permissions | `modules/graph-view/tests/unit/leaks/gate.test.ts`, `apps/brain/tests/gate/leaks.test.ts` |
| 6-8 | Belong to WP-25 and WP-26 | NOT done here |

## Commands and results (all exit 0 unless noted)

```text
pnpm structure                                   -> checked 22 packages, 1125 files, 313 folders (no violations)
pnpm guard:fakes                                 -> checked 771 files, 4 findings, 1 baselined (exit 0)
tsc --noEmit in features/visibility, modules/graph-view, services/brain-mcp, apps/brain -> no output
biome check --write on every changed .ts file    -> 0 errors, 2 warnings (unused loop variable named bulk)
features/visibility   vitest --coverage          -> 5 files, 29 tests passed; 100% stmts, 98.07% branches
features/visibility   contract                   -> 1 file, 11 tests passed
modules/graph-view    vitest --coverage          -> 16 files passed, 2 skipped; 82 passed, 7 skipped
services/brain-mcp    vitest                     -> 32 files passed, 4 skipped; 178 passed, 7 skipped
apps/brain            vitest --coverage          -> 44 files, 272 tests passed; 94.18% stmts, 97.7% lines
```

Postgres 16 gate tests: `PG_BIN=/opt/homebrew/opt/postgresql@16/bin pnpm exec vitest run tests/gate/pg` in
`apps/brain`: 2 files, 4 tests passed.

## Gate latency at 10M edges (real Postgres 16, one machine)

`BRAIN_GATE_EDGES=10000000 pnpm exec vitest run tests/gate/pg/scale.test.ts` in `apps/brain`:
10,000,000 can-read edges, 2,000,000 documents, 2,000 of them readable by the caller. Seeded with `generate_series`
(about 140 s).

```text
GATE 10000000 edges, 2000000 docs: open-25 p95 1.8 ms (max 4.4), full approve of 2000 docs 40.2 ms
Index Scan using edges_in on edges  (actual time=0.025..0.142 rows=149 loops=1)
  Index Cond: ((tenant = 't') AND (to_id = ANY ($0)) AND (kind = 'can-read'))
Execution Time: 0.161 ms
```

The live source check in this run answers at once, so the figure measures the graph side only. A real source adds
its own latency, bounded per check by `perCheckMs` (800 ms) and in total by `totalMs` (1200 ms).

## NOT done

- Production defaults cap live-rechecked documents at 10 per gate chunk (`top: 10`), so the graph and list views
  show few documents until a batched source check exists.
- Role is always "member": there is no tenant-admin source, so admin-only reader disclosure cannot trigger yet.
- `brain serve` has no per-user source tokens and the folder connector has no `canRead`, so served documents are
  hidden (fail closed) until a connector with `canRead` is wired.
- The folder connector and graph-sync write zone "personal" with no owner, so those documents stay hidden until
  promoted. Tests promote them with `promote` in `apps/brain/tests/identity/seed/seed.ts`.
- The live check is not cached or batched across requests.
- `services/brain-mcp/tests/scale/search.test.ts` (tools/list median under 5 ms) failed once under
  `--coverage` (572 ms, instrumentation overhead) and passes without it.
- `modules/graph-view` all-files coverage reads 79.6% because the skipped browser e2e support files count;
  its `src/query` is 100% and `src/routes` 95% of lines.
- No second-vendor review has run.

## Reproduce from a fresh clone

```text
git clone <repo> && cd <repo> && git checkout wp/10-permission-gate
export NODE_AUTH_TOKEN=x LC_ALL=en_US.UTF-8 PG_BIN=/opt/homebrew/opt/postgresql@16/bin
pnpm install --offline && pnpm turbo build
cd apps/brain && pnpm exec vitest run tests/gate
```
