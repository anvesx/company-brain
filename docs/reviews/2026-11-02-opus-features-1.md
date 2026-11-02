# Review: graph-store, acl-filter, connector-kit, core-types, change-cursor (Opus, 2 Nov 2026)

Read-only review. No source edited. "Verified" means reproduced today with a scratch script against
code compiled from `src/` (Node 26, `node:sqlite`). Details and test-honesty notes:
[2026-11-02-opus-features-1-details.md](2026-11-02-opus-features-1-details.md).

## Evidence run today (one package at a time)

| Package | `vitest run` | `tsc --noEmit` | Runtime deps on repo packages |
| --- | --- | --- | --- |
| core-types | 23/23 pass | exit 0 | none |
| acl-filter | 24/24 pass | exit 0 | core-types |
| connector-kit | 60/60 pass | exit 0 | core-types |
| change-cursor | 73/73 pass | exit 0 | core-types (declared, never imported) |
| graph-store | 97/97 pass | exit 0 | none |

`pnpm guard:fakes`: 587 files, 68 findings, all 26 baseline keys matched, exit 0. In scope only
`connector-kit/tests/scale/fake-scale.test.ts` (4). `pnpm structure`: exit 0. No `src/` or `tests/`
file is over 80 lines (graph-store `src/index.ts` is exactly 80). No folder holds over 5 code files.
Mutation runs were not repeated (swap pressure).

## Verdicts

| Package | Verdict | Why |
| --- | --- | --- |
| core-types | merge | Sound, bounded schemas. Follow-ups: findings 5 and 10. No spec file, no exact-research row. |
| acl-filter | merge | Prior HIGH (non-array JSON grants) is fixed and tested. Findings 5 and 13 open. |
| connector-kit | fix first | Findings 3, 6 and 11 open; 3 was raised in the last review and is still unfixed. |
| change-cursor | fix first | Contract docs contradict the code (finding 8); cursor writes can regress (7). |
| graph-store | fix first | Metadata-only guard is bypassable (1); "bi-temporal" is not what is built (2); 4. |

## Ranked findings

| # | Sev | Where | Finding |
| --- | --- | --- | --- |
| 1 | HIGH | graph-store `src/nodes.ts:48`, `src/validation/props.ts:25` | "Metadata only" (ADR 0004) is not enforced. `title`, `address`, `version`, `source` have no length cap; a 5,000,000-char title is stored (verified). Prop count and key length are unbounded, and keys outside the denylist (`notes`, `description`) pass at 1 KiB each (verified). Body text can be stored under any of these. |
| 2 | HIGH | graph-store `README.md:3`, `src/index.ts:11-16`, spec `graph-store.md:5` | Called "bi-temporal", but there is one time axis (`valid_from`/`valid_to`, caller-supplied `at`). There is no recorded-at column, so "what did the brain believe at T" cannot be answered. The spec cites Meta for bi-temporal validity; the Meta card has no temporal claim (its line 31 says graph-store covers only claim 3). Slite backs a validity window, not bi-temporality. |
| 3 | MED | connector-kit `src/connectors/folder-scan.ts:16,21`, `folder-acl.ts:16` | One malformed sidecar fails the whole `list` with a raw `SyntaxError` (verified). A file deleted between `readdir` and `realpath` does the same with `NOT_FOUND`. Raised 1 review ago; still open. A folder with churn may never finish a sync. |
| 4 | MED | graph-store `src/index.ts:63-69`, `src/nodes.ts:61` | `tombstone` at a time before the current row's `validFrom` is accepted and writes `valid_to < valid_from` (verified: upsert at 100, tombstone at 50). `upsertNode` rejects the same ordering (`nodes.ts:55`). |
| 5 | MED | acl-filter `src/clause.ts:22`; core-types `src/principal.ts:3` | The SQL clause and `isAllowed` disagree on lone surrogates: principal id `"\ud800"` matches an ACL entry U+FFFD in SQL (1 row) but not in JS (verified). SQL fails open. `PrincipalSchema` accepts such ids; the property test (grapheme strings) cannot generate them. Fix in core-types: refine `Id` with `isWellFormed()`. |
| 6 | MED | connector-kit `src/connectors/folder.ts:19-27` | `list` hides `*.acl.json`, but `fetch("x.md.acl.json")` returns the sidecar, exposing who may read `x.md` (verified). |
| 7 | MED | change-cursor `src/store.ts:30,52` | `setCursor` is last-writer-wins with no compare-and-set. Two sync workers on one (tenant, source) can move the cursor backwards. Only `seen` is race-tested. |
| 8 | MED | change-cursor `README.md:107,136-141,46-49`; spec `change-cursor.md:16` | README says there is no `close()`; `store.ts:44` has one. README says typecheck fails; it passes (exit 0 today). Spec still has `seen(eventId)` and no `forget`. The `forget` bullet is pasted mid-sentence. |
| 9 | MED | graph-store `tests/integration/scale.test.ts:8`; change-cursor `tests/scale/scale.test.ts:13,26` | Budgets were loosened without a spec change: graph-store 2000 ms vs spec 200 ms (10x); change-cursor 2000 ms vs spec and README 500 ms (4x). README `:103-104` still claims "asserts under 500 ms". |
| 10 | MED | core-types `src/acl.ts:6-7` | `allowUsers`/`allowGroups` have no `.max()`; principal groups are capped at 1000. A huge ACL is accepted and costs a `json_each` scan per row per query in acl-filter. |
| 11 | MED | connector-kit `src/connectors/folder-scan.ts:25`, `folder.ts:26` | `list` reads every file body in full to compute a version. No size cap; invalid UTF-8 is silently replaced with U+FFFD. Open since last review. |
| 12 | LOW | graph-store `src/edges.ts:36-53,66`, `src/reach.ts:29` | `neighbors` has no limit (20,000 edges returned, verified). `reach` loads all out-targets of a node before checking `limit`; `limit` has no upper bound. |
| 13 | LOW | acl-filter `src/clause.ts:15-17` | Unqualified columns: joined with any table that has `tenant_id`, the query fails "ambiguous column name" (verified). Open since last review. |

Rest (14-24): test honesty, temp-dir leaks and coupling, in the details file.

## Fixed (2 Nov 2026, follow-up)

Each fix was test-first: the new test failed, then the change made it pass.

| # | Status | What changed |
| --- | --- | --- |
| 1 | fixed | graph-store caps `title` 512, `address` 2048, `version` 256, `source` 128 bytes; props at most 32 entries, keys are identifiers of at most 64 bytes, values at most 1 KiB, 4 KiB in total; no control characters anywhere. Limits are in the package README. |
| 2 | docs only | README now says one caller-supplied validity axis, no recorded-at, not bi-temporal. The spec wording (`graph-store.md`) and the Meta citation are untouched and still open. |
| 3 | fixed | `list` skips an entry with a bad sidecar (`BAD_ACL`) or one that vanished mid-scan (`VANISHED`) and returns it in `skipped`. `PATH_ESCAPE` still aborts. |
| 4 | fixed | `tombstone` before the current row's `validFrom` throws `BAD_INPUT`, with no partial write. |
| 5 | fixed | core-types `IdSchema` refines with `isWellFormed()`; used by principal, ACL and pointer ids. Property test generates lone surrogates. tsconfig lib is ES2024. |
| 6 | fixed | `fetch` of any `*.acl.json` (by name, dotted path or symlink) throws `NOT_FOUND`. |
| 14 | fixed | graph-store `lifecycle.test.ts` restores env vars exactly through `withEnv` (an absent variable stays absent). |

Still open: 2 (spec wording), 7 to 13, and 15 to 24.
