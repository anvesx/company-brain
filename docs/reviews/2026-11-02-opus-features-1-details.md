# Review details: five features (Opus, 2 Nov 2026)

Continues [2026-11-02-opus-features-1.md](2026-11-02-opus-features-1.md). Findings 14-24.

## Test honesty

| # | Sev | Where | Finding |
| --- | --- | --- | --- |
| 14 | MED | graph-store `tests/unit/validation/lifecycle.test.ts:40-41` | Restores env with `process.env.X = prior`. When `prior` was unset this writes the string `"undefined"`, leaking `NODE_ENV="undefined"` into later tests in the worker. Use `delete` when `prior === undefined`. |
| 15 | LOW | graph-store `lifecycle.test.ts:47` | `expect(tmpDir()).toBeTruthy()` is padding: unrelated to the test name ("rejects a missing or empty path"). |
| 16 | LOW | graph-store `lifecycle.test.ts:9-19` | The "every method throws CLOSED" list omits `edgesBySource`. |
| 17 | LOW | `lifecycle.test.ts:22-26`; change-cursor `tests/unit/errors.test.ts` (whole file); connector-kit `tests/unit/enforces-token.test.ts:14-16` | Tautological: construct an error class and read back the code passed in. `FORBIDDEN` has no producer anywhere in connector-kit. Replace with tests that make real code throw each code, or delete. |
| 18 | LOW | connector-kit `tests/scale/fake-scale.test.ts` | The 4 baselined `fake-in-real-tier` hits benchmark the fake, which is just `pageItems`. Import `pageItems` directly and the baseline shrinks by one key. |
| 19 | LOW | connector-kit `tests/**` (e.g. `scale/folder-scale.test.ts:20`) | No test removes its `mkdtemp` dir; the scale test leaves 5,250 files in `$TMPDIR` per run. graph-store and change-cursor clean up. |

Assertions otherwise test behaviour: the acl-filter property test compares real SQLite against
`isAllowed` (1000 runs), and the graph-store and change-cursor race tests use real OS processes and
worker threads on one file. The scale tests are honest about their budgets in comments, but see #9.

## Coupling (registry goal: least interdependency)

| # | Sev | Where | Finding |
| --- | --- | --- | --- |
| 20 | LOW | change-cursor `package.json:17` | `@anvesx/core-types` is declared but never imported (README `:142` admits it). It is a phantom edge in the graph. Drop it. |
| 21 | LOW | connector-kit `src/core/contract.ts:12,13,25-28` | The production contract carries test-only `FakeDoc`, a `FORBIDDEN` code nothing raises, and optional `canRead`/`listMemberships` with no implementation or test here. Move `FakeDoc` to `tests/support/fake.ts`; test or document the optional methods. |
| 22 | LOW | `services/index-service/src/pipeline/content.ts:5` | Re-implements `contentHash` instead of importing connector-kit's. C2 extract candidate (out of scope, noted for the registry). |

Graph of the five: graph-store has 0 repo deps; acl-filter and connector-kit depend only on
core-types; no feature imports another feature. graph-store keeps its own ACL model (`can-read`
edges) apart from core-types `Acl`. That keeps it independent, but two ACL models can drift; record it in ADR 0004.

## Other L8 defects

| # | Sev | Where | Finding |
| --- | --- | --- | --- |
| 23 | LOW | connector-kit `tests/support/fake.ts:7`; `folder-scan.ts:34`; `folder.ts:24-26`; `walks.ts:36` | Open from the last review: shallow ACL copy (arrays shared with the caller); `localeCompare` order depends on host locale; `stat` before `readFile` (TOCTOU version); final page cannot be retried (walk dropped). `fetch` ignores `signal`. |
| 24 | LOW | change-cursor `src/store.ts:21`, `src/schema.ts:40,61`; graph-store `src/index.ts:39` | Legacy-table probe and `DROP` still run outside a transaction (open). `requireCursor` spreads the whole string into code points before the size check (a 100 MB cursor allocates first). Fractional clock values are stored in an `INTEGER` column (open). `openDb` blocks the event loop with `Atomics.wait` for up to 5 s. |

## Spec vs code vs exact research

- core-types: no `docs/specs/feature/core-types.md` and no row in the exact-research audit table.
  By that table's own rule, it should be labelled "our proposal".
- acl-filter: matches spec and Vectorize ("permissions enforced at retrieval, per user").
- connector-kit: code is ahead of the spec (version format, `FORBIDDEN`, `signal`, walk cursors).
  Spec behaviour 4 still says "version is mtime+size". The spec layout puts `fake.ts` in `src/`; it lives in `tests/support/`.
- change-cursor: spec interface is stale (finding 8). Webhook/scheduled-pull backing (Slite) holds.
- graph-store: `edgesBySource` is not in the spec. The bi-temporal claim and the Meta citation fail (finding 2).

## Fixed since the last review (opus-five-features.md)

acl-filter non-array JSON grants and malformed-JSON query failure (both covered by `tests/unit/shape.test.ts`);
change-cursor README `seen(event.id)` example; change-cursor typecheck; change-cursor `close()`.
