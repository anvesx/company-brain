# Review: five feature packages (Opus)

Scope: `features/{chunker,connector-kit,change-cursor,pointer-registry,acl-filter}`: README, `src/`, `tests/`.
Read-only review. No source edited. Findings marked "verified" were reproduced with a scratch script against `dist/` (Node `node:sqlite`).

**Totals: 2 HIGH, 10 MEDIUM, 18 LOW.**

## pointer-registry

| Rank | Where | Finding | Fix |
| --- | --- | --- | --- |
| HIGH | `src/change.ts:3` | `same()` compares ACL lists by `sort().join("\0")`. `AclSchema` allows `\0` in ids, so `["a\0b","c"]` and `["a","b\0c"]` join to the same string. The upsert reports `unchanged` and the new ACL is never written (verified: `isUnchanged` returns `true`). A stale ACL is a security defect. | Compare element-wise after sorting (`a.every((x,i)=>x===b[i])`), or compare `JSON.stringify` of the sorted arrays. Add a test with `\0` in ids. |
| MEDIUM | `src/change.ts:3`, `README.md:10` | README says ACL lists compare "as sorted sets", but the code compares multisets: `["a","a"]` vs `["a"]` reports `updated`. Harmless (it over-writes) but the contract is misstated. | Dedupe before comparing, or change the README to "multisets". |
| LOW | `src/registry.ts:57` | For `unchanged`, the stored row is re-read after `COMMIT`, outside the transaction. Another writer can change the row in between, so the returned pointer may not be the one compared. | Read the row inside `write()` and return it with the change. |
| LOW | `src/registry.ts:61,69` | `id` and `afterId` are not validated. A non-string reaches `node:sqlite` and throws a raw error, not `RegistryError("INVALID")`. | Validate both as strings; throw `INVALID`. |
| LOW | `src/schema.ts:58` | `fromRow` parses `acl_json` without validation, so a hand-edited row produces an untyped `Pointer`. | Parse through `AclSchema`. |
| LOW | `src/schema.ts:35` | `ORDER BY id` is SQLite BINARY (UTF-8 bytes, code point order). `change-cursor` sorts by UTF-16 code units. The two orders differ for astral vs BMP-high characters. | Document the order in both READMEs, or align on one. |

## acl-filter

| Rank | Where | Finding | Fix |
| --- | --- | --- | --- |
| HIGH | `src/clause.ts:12-13` | `json_each` iterates any JSON shape. An `allow_users` value of `{"k":"alice"}` or the scalar `"alice"` grants `alice` access (verified: 2 rows visible). `isAllowed` cannot model these shapes, so the "pure twin" claim fails and the SQL side fails open. | Guard each column with `json_type(col) = 'array'` (inside a `CASE` so it is evaluated first). Test non-array, scalar, and nested shapes. |
| MEDIUM | `src/clause.ts:12` | One malformed `allow_users` or `allow_groups` value makes the whole query throw `malformed JSON` (verified). One corrupt row then blocks search for every principal. | `CASE WHEN json_valid(col) AND json_type(col)='array' THEN EXISTS(...) ELSE 0 END`. |
| MEDIUM | `tests/helpers.ts:14` | The 1000-run property test only writes `JSON.stringify(array)`, so it cannot reach either finding above. Weak test. | Add an arbitrary for the raw column text (object, scalar, invalid, NULL) and assert those rows are denied. |
| LOW | `src/clause.ts:11-13` | Column names are unqualified. In a join with another table that has `tenant_id`, the clause fails as ambiguous or binds to the wrong table. | Accept an optional table alias and prefix the three columns. |
| LOW | `src/allowed.ts:4` | No input checks (documented). Ids are compared without Unicode normalisation, so NFC and NFD forms of one id do not match. This fails closed, but it is undocumented. | State it in the README. Normalise at the `PrincipalSchema`/`AclSchema` boundary if wanted. |

## chunker

| Rank | Where | Finding | Fix |
| --- | --- | --- | --- |
| MEDIUM | `src/chunk.ts:56` | The 50,000-chunk cap is checked only as a pre-split estimate. Text whose paragraphs cannot merge produces more chunks than estimated: `"abcdef\n\n" x 55000`, size 10, overlap 0, returns **55,000** chunks (estimate 44,000). This breaks the README's "at most 50,000" (verified). | After `split`, `if (pieces.length > MAX_CHUNKS) throw tooMany()`. Keep the estimate as an early exit. |
| MEDIUM | `tests/scale/limits.test.ts:19` | The cap test asserts the estimate, not the output length, so it locks in the gap above. | Assert `chunks.length <= MAX_CHUNKS` on an input that is under-estimated. |
| LOW | `src/chunk.ts:36` | Code-point splitting means `size: 1` with emoji gives chunks of 2 UTF-16 units, larger than `size`. The library also writes a `console.warn` for each oversized chunk (verified). | Document that one code point can exceed `size`. Silence or route the library warning. |
| LOW | `src/chunk.ts:29` | Every `RangeError` from the library becomes `TOO_MANY_CHUNKS`, including errors such as `Invalid string length`. | Match on the stack-overflow message, or check `pieces`/depth instead. |
| LOW | `src/offsets.ts:20` | The bare `catch` retries with unbounded slack on any error, not only `OFFSET_LOST`. | `catch (e) { if (!(e instanceof ChunkError)) throw e; ... }`. |
| LOW | `src/chunk.ts:43`, `package.json` | `docId: ""` is accepted. `@anvesx/core-types` is a dependency but never imported. | Require a non-empty `docId`. Drop the unused dependency. |

## connector-kit

| Rank | Where | Finding | Fix |
| --- | --- | --- | --- |
| MEDIUM | `src/connectors/folder-scan.ts:16-21` | A file deleted between `readdir` and `realpath` throws `NOT_FOUND` and aborts the whole `list`. One malformed sidecar does the same (documented). A live folder with churn can then never finish a sync. | During scan, skip entries that raise `ENOENT`/`NOT_FOUND`. Report bad sidecars per document (deny-all plus an error list) instead of failing the walk. |
| MEDIUM | `src/connectors/folder-scan.ts:34` | `localeCompare` depends on ICU and locale, and returns `0` for distinct NFC/NFD addresses (`"café"` vs `"café"`, verified). Page order is then not stable across hosts. | Sort by code unit: `a < b ? -1 : a > b ? 1 : 0`. |
| MEDIUM | `src/connectors/folder.ts:26` | `readFile(..., "utf8")` replaces invalid bytes with U+FFFD silently, although the README says "Files must be UTF-8". There is no size cap, so a 2 GB file is read into memory. | Decode with `new TextDecoder("utf-8", { fatal: true })`. Add a max-bytes option that throws a typed error. |
| LOW | `src/connectors/folder.ts:24-26` | `version` comes from `stat` taken before `readFile`. A write in between returns new text under the old version. | `stat` again after the read and retry if `mtimeMs`/`size` changed. |
| LOW | `src/connectors/folder.ts:19`, `src/core/contract.ts:23` | `fetch` ignores `context.signal`. | Pass `signal` to `readFile`. |
| LOW | `src/core/walks.ts:36-37` | The walk is deleted after its last page, so retrying the final page after a transport error throws `BAD_CURSOR`. | Keep finished walks until LRU eviction, or document "restart on BAD_CURSOR". |
| LOW | `src/connectors/fake.ts:5` | `{ ...doc.acl }` copies only one level. `allowUsers`/`allowGroups` arrays stay shared with the caller, so the "snapshot" can change. | `structuredClone(doc)`. |
| LOW | `src/connectors/folder-scan.ts:14` | Any entry ending in `.acl.json` is skipped, including a real document or a directory with that name. | Skip only when the base document exists beside it. |

## change-cursor

| Rank | Where | Finding | Fix |
| --- | --- | --- | --- |
| MEDIUM | `README.md:74` | The usage example still calls `store.seen(event.id)`. Under the current API this passes the event id as `tenantId` and throws `INVALID_INPUT`. The contract doc is out of date. | `store.seen(tenantId, event.id)`. |
| MEDIUM | `README.md:132`, `package.json` | Typecheck is known to fail (`@types/node` is unresolvable), so the strict-TS gate is not enforced for this package. | Add `@types/node` as a devDependency (lockfile change, human merge) and make typecheck part of CI. |
| LOW | `src/store.ts:19` | The legacy-table probe and `DROP` are not in a transaction. Two processes opening a fresh file can race: B probes (absent), A creates and inserts, B drops A's rows. | Wrap the probe, drop and `SCHEMA_SQL` in `BEGIN IMMEDIATE ... COMMIT`. |
| LOW | `src/schema.ts:61` | `requireTime` accepts fractional ms, which are stored as REAL in an `INTEGER` column. A clock running backwards keeps rows "seen" longer than the TTL. | `Math.floor` the time. Document the monotonic-clock assumption. |
| LOW | `src/store.ts:13` | There is no `close()` (documented), so tests and reopen paths leak handles. `pointer-registry` already has one. | Add `close()` for parity. |

## Layering

No layering violations. Every package imports only `@anvesx/core-types`, `node:*`, and (chunker only) `@langchain/textsplitters`. No feature imports another feature. Hygiene only: unused `@anvesx/core-types` dependency in `chunker` and `change-cursor`.
