# Codex review: five feature packages

Scope: read every package README, `src/` file, and test in `chunker`, `connector-kit`,
`change-cursor`, `pointer-registry`, and `acl-filter`. Source was not edited. Rankings reflect
production correctness/security impact, then contract and test strength.

## `features/chunker`

1. **MEDIUM — malformed options escape the typed error contract.**
   `features/chunker/src/chunk.ts:40-42` dereferences `opt.size` before validating `opt`; a JS caller
   passing `null` gets raw `TypeError`/no `code`, although `features/chunker/README.md:32` says invalid
   options throw `ChunkError(BAD_OPTIONS)`. `features/chunker/tests/unit/chunk/options.test.ts:6-52` covers bad fields
   and bad `docId`/`text`, but not a non-object options value. **Fix:** accept `unknown` internally,
   reject null/arrays/non-objects with `BAD_OPTIONS`, and add `null`, array, string, and number cases.
2. **LOW — the normative spec and shipped ID/error contracts disagree.**
   `docs/specs/feature/chunker.md:13-18` specifies two error codes and a colon-concatenated hash,
   while `features/chunker/src/chunk.ts:15-19` uses a JSON tuple and `features/chunker/src/errors.ts:1` adds
   `TOO_MANY_CHUNKS`. The README documents the breaking format, but spec-driven consumers can build
   incompatible IDs. **Fix:** update the spec and add a versioned ID-format migration note/test vector.

## `features/connector-kit`

1. **HIGH — a same-size edit can keep the same source version.**
   `features/connector-kit/src/connectors/folder-acl.ts:23-25` versions content only by
   `mtimeMs:size`; restoring/coarsening mtime after `"one" -> "two"` reproduced an identical version
   while `fetch` returned new text. This violates `docs/specs/feature/connector-kit.md:28`; the test at
   `features/connector-kit/tests/integration/folder.test.ts:34-43` changes both size and mtime. **Fix:** include a content
   digest (or a source-native immutable revision) and test same-size writes with fixed mtime.
2. **MEDIUM — the fake does not actually snapshot nested ACL arrays.**
   `features/connector-kit/src/connectors/fake.ts:4-13` copies the ACL object but aliases
   `allowUsers`/`allowGroups`; mutating the fixture after construction changes later listings. The
   snapshot test at `features/connector-kit/tests/unit/paging.test.ts:53-59` mutates only scalar `text`. **Fix:** clone both
   arrays (and return defensive listing copies or freeze the snapshot); test input and output mutation.

## `features/change-cursor`

1. **HIGH — `seen` can permanently suppress an event whose handler failed.**
   `features/change-cursor/src/store.ts:30-37` records the ID before returning `false`; the documented
   workflow at `features/change-cursor/README.md:73-75` then calls `handle`. A crash/throw after `seen`
   makes the retry return `true` for 24 hours, losing work. `features/change-cursor/tests/unit/store-seen.test.ts:7-35` checks
   only successful receipt/TTL. **Fix:** expose claim/complete/fail states with an expiring lease, or
   atomically commit the dedupe record with the handled side effect; add crash-and-retry tests.
2. **MEDIUM — stores cannot release SQLite handles.**
   `features/change-cursor/src/store.ts:5-10` exposes no `close`, and durable tests open multiple stores
   without closing them (`features/change-cursor/tests/integration/durable.test.ts:17-32`). Long-lived test runners, tenant
   churn, and Windows DB rotation can leak/lock files. **Fix:** add idempotent `close(): void`, reject
   calls after close, and close every handle in `finally`/`afterEach` tests.

## `features/pointer-registry`

1. **HIGH — delimiter-based ACL equality can hide a real permission change.**
   `features/pointer-registry/src/change.ts:3` compares sorted arrays with `join("\0")`; IDs may contain
   NUL because `features/core-types/src/acl.ts:3-8` permits any 1-256 character string. Thus
   `["a\0b","c"]` and `["a","b\0c"]` compare equal, so `features/pointer-registry/src/registry.ts:38` returns `unchanged` and keeps
   stale ACLs. `features/pointer-registry/tests/unit/change.test.ts:45-50` covers reorder only. **Fix:** sort copies and compare
   each element (and decide whether duplicates are set-normalized); add delimiter/NUL regression cases.
2. **LOW — non-upsert key inputs bypass the package's typed validation.**
   `features/pointer-registry/src/registry.ts:60-75` validates tenant and timestamp but passes `id` and
   `afterId` directly to SQLite; wrong runtime types can yield SQLite errors or silent misses instead
   of `RegistryError("INVALID")`. Tests at `features/pointer-registry/tests/unit/isolation.test.ts:27-35` cover tenant only.
   **Fix:** validate non-empty string IDs/cursors at every public boundary and add null/object cases.

## `features/acl-filter`

1. **HIGH — exact tenant matching depends on the caller's SQLite collation.**
   `features/acl-filter/src/clause.ts:10-14` uses bare `tenant_id = ?`; on a `TEXT COLLATE NOCASE`
   column, tenant `ACME` matched row tenant `acme` in reproduction, contradicting exact matching in
   `features/acl-filter/README.md:10-13`. Tests create only default-BINARY columns
   (`features/acl-filter/tests/integration/integration.test.ts:7-17`). **Fix:** force `COLLATE BINARY` for tenant, user,
   and group comparisons, then test `NOCASE` tables with case-distinct tenant/principal IDs.
2. **MEDIUM — malformed ACL JSON aborts the whole query instead of denying the row.**
   `features/acl-filter/src/clause.ts:12-13` feeds columns directly to `json_each`; one malformed value
   reproduced `SQLITE_ERROR: malformed JSON`. The deny-by-default suite tests only NULL columns at
   `features/acl-filter/tests/integration/integration.test.ts:29-35`. **Fix:** call `json_each` on `[]` unless
   `json_valid(column)`, and add malformed, scalar, object, and mixed-validity rows.
