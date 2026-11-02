# Reuse review: can features and services be published and reused?

Verdict: **not yet.** The tarballs build and import cleanly as ESM with working types, but only if a consumer installs every `@brain/*` sibling by hand, uses Node 22.13 or later, and accepts exact-pinned copies of zod, the MCP SDK and core-types. One public API also lets any caller bypass ACLs with raw SQL. 6 HIGH, 8 MED, 6 LOW.

Reviewed 2026-11-02 against the working tree (no git), Node 26.0.0, pnpm 8.15.0.

## Evidence: pack and install

Packed with `pnpm pack`: core-types, hybrid-search, query-service, acl-filter and pointer-registry. Installed with `npm install` into a clean temp consumer project.

| Check | Result |
| --- | --- |
| Tarball contents | `dist/*.js`, `dist/*.d.ts`, README, package.json. No LICENSE, no CHANGELOG, no source maps. |
| `workspace:*` rewrite | Rewritten to the **exact** `"0.1.0"`, not `^0.1.0`. |
| Install query-service tarball alone | **E404** `GET https://registry.npmjs.org/@brain%2facl-filter`. Without the repo's `.npmrc` scope line, every `@brain/*` dependency resolves against public npm. |
| Install all 5 tarballs together | OK. 8 packages added; `sqlite-vec-darwin-arm64` native binary pulled. |
| ESM `import` of all 5 | OK. Public export names match each `src/index.ts`. |
| `require("@brain/core-types")` | Works only because Node 26 supports `require(esm)`. Node 22.0 to 22.11 throws `ERR_REQUIRE_ESM`. |
| Deep import `@brain/hybrid-search/dist/search/db.js` | **Works.** Internals are importable because there is no `exports` map. |
| TS consumer, `moduleResolution` nodenext and bundler | Typechecks clean. |
| `createSearchIndex(":memory:",4)` then add, then search | OK. 1 hit returned. |
| `search({ acl: { sql: "1=1", params: [] } })` | **Returns the hit.** Any caller can bypass the ACL (H1). |
| `add()` with a malformed `acl` | Throws an opaque `SearchError("DB")` with "cannot be bound to SQLite parameter 4". The ACL is not validated against `AclSchema`. |

## HIGH

**H1. hybrid-search accepts raw SQL as its ACL, which couples it to acl-filter through a hidden schema and opens an ACL bypass.**
- `features/hybrid-search/src/index.ts:4` `AclFragment = { sql: string; params: unknown[] }`; `SearchQuery.acl` is spliced into SQL at `src/search/fts.ts:20` and `src/search/vec.ts`.
- `features/acl-filter/src/clause.ts:14-18` hardcodes hybrid-search's column names (`tenant_id`, `allow_users`, `allow_groups`), and `features/hybrid-search/src/search/db.ts:26` defines them. Neither package depends on the other, and no shared type ties them together. Renaming a column in one breaks the other silently.
- I verified the bypass: `acl: { sql: "1=1" }` returns every tenant's rows.
- **Fix:** make the index take a `Principal` (from core-types) and build the predicate itself, either by moving `allowClause` into hybrid-search or by making acl-filter a dependency of it. Remove `AclFragment` from the public type. If a pluggable filter is required, export a branded opaque type that only `allowClause` can construct. Treat this as a breaking change with a migration note (see M7).

**H2. Shared singletons ship as regular `dependencies` with exact pins, so consumers get duplicate copies.**
- `features/mcp-search-tool/package.json:18` `@modelcontextprotocol/sdk: "1.32.2"`. Its public function `registerSearchTool(server: McpServer, ...)` (`src/register.ts:16`) takes the caller's `McpServer`. A host on SDK 1.33 gets two SDK copies, and the types become incompatible.
- `features/mcp-search-tool/package.json:19` and `services/mcp-service/package.json` declare `zod: ^4.6.7`. The zod schemas built here (`src/schema.ts:1`) are passed into the host's SDK, which carries its own zod.
- `features/core-types/package.json` declares `zod: ^4.6.7`. It exports zod schemas (`AclSchema`, `PointerSchema`, `PrincipalSchema`) as API. A zod 3 host cannot compose them.
- **Fix:** move `@modelcontextprotocol/sdk` and `zod` to `peerDependencies` with ranges (`"@modelcontextprotocol/sdk": "^1.32.0"`, `"zod": "^4.0.0"`), and keep them in `devDependencies` for tests. Apply this to mcp-search-tool, mcp-service and core-types.

**H3. `workspace:*` publishes as an exact version, so core-types and siblings are duplicated per dependent.**
- Every feature has `"@brain/core-types": "workspace:*"` (for example `features/hybrid-search/package.json:17`), and every service lists siblings the same way (for example `services/query-service/package.json:17-20`). The packed result is `"0.1.0"` exact.
- `services/query-service/src/errors.ts:18` uses `error instanceof SearchError` from `@brain/hybrid-search`. If the host's index comes from a different hybrid-search copy, the check fails and `DIM` errors are misreported as `BACKEND`. Core-types schemas have the same identity problem.
- **Fix:** use `workspace:^` so the published range is `^0.1.0`. Make `@brain/core-types` a `peerDependency` of every feature and service, since its types appear in their public signatures. In query-service, replace the `instanceof` check with a `code`/`name` check (`error?.name === "SearchError"`).

**H4. Packages cannot be installed outside this repo, and the `@brain` scope is exposed to dependency confusion.**
- `.npmrc:1` (`@brain:registry=https://npm.pkg.github.com`) is the only thing routing the scope. I verified a clean install hits `registry.npmjs.org/@brain/...` and gets a 404. If anyone registers `@brain/*` on public npm, they are served instead.
- `modules/*/package.json` and `apps/brain/package.json` have no `publishConfig` and are not `private`.
- **Fix:** rename the scope to one the org owns on GitHub Packages (for example `@anvesx/...`; GitHub Packages requires the scope to match the owner), or claim `@brain` on npmjs. Document the consumer `.npmrc` (scope line plus `//npm.pkg.github.com/:_authToken`) in each README "Install" section. Add `publishConfig` to modules and apps, or mark them `"private": true` (see M8).

**H5. The `node:sqlite` requirement is undocumented and under-specified. Root `engines >=22` is wrong and no package declares `engines`.**
- Runtime `node:sqlite` users: `features/hybrid-search/src/search/index-db.ts:15`, `features/change-cursor/src/store.ts:19`, `features/pointer-registry/src/registry.ts:23`, `features/audit-chain/src/store.ts:33`.
- `node:sqlite` is behind `--experimental-sqlite` before Node 22.13 and 23.4. The `allowExtension` option that hybrid-search needs for sqlite-vec arrives in 22.13 and 23.5. Root `package.json` says `"node": ">=22"`, and none of the 8 tarballs carries `engines` (I verified this).
- `features/hybrid-search/README.md` never says `node:sqlite`, a minimum Node version, or that sqlite-vec ships a per-platform native binary.
- `services/query-service` and `services/index-service` pull hybrid-search's native binary even when the host supplies its own index. query-service imports it only for `MAX_WINDOW` and `SearchError` (`src/service.ts:2`, `src/errors.ts:1`).
- **Fix:** add `"engines": { "node": ">=22.13.0" }` to the 4 SQLite features and their dependents. Add a "Runtime requirements" section to each README. In query-service, move `MAX_WINDOW` and the `SearchIndex`, `Hit` and `SearchError` contract into core-types, or into a new types-only `@brain/search-contract`, so services depend on the interface rather than the SQLite implementation.

**H6. Services and modules have no license, so they cannot legally be reused. Features are `UNLICENSED`.**
- `services/*/package.json` has no `license` and no `repository` (audit-service, connector-runtime, index-service, mcp-service, query-service). The same is true of `modules/*` and `apps/brain`.
- `features/*/package.json` declares `"license": "UNLICENSED"`, and there is no LICENSE file at the repo root or in any tarball.
- **Fix:** decide the license. For internal-only reuse, `UNLICENSED` plus a LICENSE file stating the terms is acceptable. Add `license`, `repository` (with `directory`) and a `LICENSE` file to every publishable package, then add `"LICENSE"` to `files`.

## MED

**M1. No `exports` map, so every internal file is public API.** All packages use only `main` and `types` (for example `features/hybrid-search/package.json:5-6`). I verified a deep import of `dist/search/db.js`. Any internal refactor is a breaking change. **Fix:** `"exports": { ".": { "types": "./dist/index.d.ts", "import": "./dist/index.js" }, "./package.json": "./package.json" }` on every package. Keep `main` and `types` as fallbacks.

**M2. ESM-only with no CJS story or statement.** `"type": "module"` with NodeNext output. CJS hosts work only on Node 22.12 or later, through `require(esm)`. **Fix:** state "ESM-only" in each README, which the H5 engines bump covers. Alternatively, add a `"require"` condition if CJS hosts matter.

**M3. No database handle injection. Each store opens its own file and hardcodes table names and pragmas.**
- `createSearchIndex(path, dim)`, `createRegistry(dbPath)`, `createCursorStore(path)` and `createAuditChain(path)` each call `new DatabaseSync(path)` and force `journal_mode=WAL` and `busy_timeout`.
- Table names (`chunks`, `chunks_fts`, `chunks_vec`, `pointers`, `cursors`, `seen_events`, `audit`) are unprefixed: `features/hybrid-search/src/search/db.ts:26`, `features/pointer-registry/src/schema.ts:19`, `features/change-cursor/src/schema.ts:10,16`, `features/audit-chain/src/store.ts:35`. A host cannot co-locate them in its own database without a name clash, and cannot pass in its own connection, pragmas or encryption.
- **Fix:** accept `string | DatabaseSync` plus an optional `{ tablePrefix?: string; pragmas?: boolean }`. Only set pragmas when the package opened the file itself.

**M4. No schema versioning, and one silent destructive migration.** No `PRAGMA user_version` exists anywhere. Every DDL is `CREATE ... IF NOT EXISTS`. `features/change-cursor/src/store.ts:21` drops the legacy `seen_events` table on open, with no note. `createSearchIndex` reopened with a different `dim` keeps the old `vec0` table (`src/search/vec.ts:8`) and fails later. **Fix:** set `PRAGMA user_version` per package and refuse to open newer schemas. Store `dim` in a meta table and reject a mismatch with `SearchError("DIM")`. Document every migration in CHANGELOG.

**M5. Hidden coupling: connector-runtime stores its own state inside the CursorStore key space.** In `services/connector-runtime/src/state/pending.ts:4-7` and `src/state/failures.ts:11-18`, JSON is written under `${connector.id}#inflight`, `#attempts` and `#dead`, and is bounded by change-cursor's 4096-character cap. A host that shares the cursor store, or a connector id containing `#`, collides. **Fix:** give connector-runtime its own `StateStore` interface, or a namespaced KV method on CursorStore, and document the reserved `#` suffix.

**M6. No `close()` on `SearchIndex` or `CursorStore`.** `features/hybrid-search/src/index.ts:22-30` and `features/change-cursor/src/store.ts` have none. Only pointer-registry has one, at `registry.ts:77`. Reusing hosts leak file handles and WAL locks in tests and hot reloads. **Fix:** add `close(): void` to both interfaces.

**M7. Breaking changes ship as `minor` with no migration notes, and nothing has been released.**
- `.changeset/index-atomic-replace-and-hash.md` removes `CLEANUP_FAILED` as a minor bump.
- `.changeset/review-fixes-hybrid-search.md` says "Re-index required ... see issue tracker" with no steps.
- 23 changesets are pending, there is no `CHANGELOG.md` in any package, and every version is still `0.1.0`.
- **Fix:** run `changeset version` before the first publish. For each removal, add a "Migration" paragraph inline (what to change, whether to re-index, the exact command). After 1.0, removals are `major`.

**M8. No build-before-publish guard, and the publish set is undefined.** No package has `prepublishOnly` or `prepack`, so `pnpm pack` ships whatever `dist/` is on disk. `.changeset/config.json` has `"ignore": []`, and modules and apps are not `private`, so `changeset publish` publishes all 18 packages. **Fix:** add `"prepublishOnly": "tsc -p tsconfig.build.json"` to each package. Mark `apps/brain`, and `modules/*` if they are not meant for reuse, as `"private": true`.

## LOW

| # | Finding | Location | Fix |
| --- | --- | --- | --- |
| L1 | No public-API section in 11 of 17 READMEs. hybrid-search, audit-chain, core-types, mcp-search-tool, all 5 services except query-service, and all 3 modules lack an "API" or "Usage" heading. | `features/*/README.md`, `services/*/README.md` | Add Install, Requirements, API (each export, with signature) and Errors sections. Generate them with `api-extractor` and commit `etc/*.api.md` so API diffs show in review. |
| L2 | Type-only sibling deps installed as runtime deps. query-service uses pointer-registry only for `type Registry` (`src/request.ts:3`). | `services/query-service/package.json:20` | Move to `peerDependencies`, optional, or move the interface to core-types. |
| L3 | `add()` does not validate `acl` against `AclSchema` and fails with an opaque `DB` error. | `features/hybrid-search/src/search/validate.ts` (`validateChunk`) | `AclSchema.parse(chunk.acl)` and throw `SearchError("INPUT")`. |
| L4 | Root README says features depend on "nothing", but 8 of 9 depend on core-types. | `README.md` (Architecture table) | Say "core-types only". |
| L5 | No `sideEffects: false`, `keywords` or `description`, which hurts registry discovery and tree-shaking. | all `package.json` | Add them. |
| L6 | Stale `.stryker-tmp/` sandboxes in the source tree. They are not shipped because of `files: ["dist"]`, but they pollute greps. | `features/core-types/.stryker-tmp/` | Add to `.gitignore` and clean. |

## Suggested order

1. H1 (security plus coupling) and H5 (search contract into core-types). These are API changes, so a human merges them (A15).
2. H2, H3 and M1: `package.json`-only changes that a junior can make from this file.
3. H4, H6 and M8: decisions on scope, license and the publish set. These belong to the owner.
4. M3 to M7 and the LOW items.

Re-verify by repeating the evidence table: a clean `npm install` of a single tarball must succeed with only a consumer `.npmrc`, `acl: { sql: "1=1" }` must be a type error, and the deep import must fail with `ERR_PACKAGE_PATH_NOT_EXPORTED`.
