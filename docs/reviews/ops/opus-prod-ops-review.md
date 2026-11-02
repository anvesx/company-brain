# Production readiness: security and operations review

Reviewer: Opus (read-only). Date: 2026-11-02. Scope: `apps/brain/src`, `services/*/src`, the SQL in `features/*/src`, `.github/workflows`.

## Bottom line

**Company Brain is not deployable to production today.** The core security code is sound. HMAC tokens are compared in constant time, every SQL statement is tenant-scoped, access control list (ACL) checks run inside the queries, and audit writes fail closed. The service around that code is missing. There is no production entrypoint, no deploy artifact, no health endpoint, no metrics, no backups and no schema migrations.

| Area | Verdict |
| --- | --- |
| Token signature and compare | PASS (meets the bar) |
| Token expiry | PARTIAL: no max lifetime, no revocation |
| Key rotation | MISSING |
| Tenant isolation in SQL | PASS, with one unsafe API seam |
| Secret handling and config validation | PARTIAL |
| Request size limits | PASS (1 MiB body, 2,000-char query) |
| Rate limits | PARTIAL: session caps only, no request rate |
| Graceful shutdown | PARTIAL: 3 of 4 SQLite handles never closed |
| Health and readiness | MISSING |
| Structured logging | PARTIAL |
| Metrics | MISSING |
| SQLite backups | MISSING |
| Schema migrations | MISSING |
| Timeouts and retry on external calls | MISSING |
| Dockerfile and deploy manifests | MISSING |
| CI | PARTIAL |

## What is missing entirely

1. **A production entrypoint.** `apps/brain/src/bin.ts:8-11` exits unless `BRAIN_DEMO=1`. The only connector is the in-memory fake, and embeddings are a 2-number toy (`config.ts:27`). No code path wires a real connector, a real embedder or `userTokenFor`.
2. **Deploy artifacts.** The repo has no Dockerfile, `.dockerignore`, compose file, Kubernetes manifest, systemd unit or Procfile.
3. **Health and readiness endpoints.** `services/mcp-service/src/http/server.ts:38` answers 404 for every path except `/mcp`.
4. **Metrics.** No counters, histograms or `/metrics` route exist. The design names Prometheus through OpenTelemetry (`docs/brain/model.json`); none of it is built.
5. **Key rotation.** One `BRAIN_AUTH_SECRET`, no key id in the token.
6. **Token revocation.** A leaked token stays valid until `exp`.
7. **Backups** for the 4 SQLite files and the anchor log.
8. **Schema migrations.** No `PRAGMA user_version` exists anywhere in the repo. Every schema is `CREATE ... IF NOT EXISTS`.
9. **Timeouts on external calls** to `embed`, `embedQuery`, `fetchText` and `connector.list`.
10. **Scheduled ingestion.** `bin.ts:32-37` ingests once at startup. Nothing re-runs it, so the index goes stale from the first minute.
11. **Request rate limiting** per principal.

## HIGH

**H1. Persistent mode accepts unsigned tokens.** With `BRAIN_DATA_DIR` set and no `BRAIN_AUTH_SECRET`, `bin.ts:23` falls back to `demo.principalFor`. That resolver (`config.ts:41,54-59`) trusts any `Bearer user:tenant` header. Any caller can claim any user in any tenant against durable data. `resolveAuditKey` (`auth/audit-key.ts:12`) already treats `BRAIN_DATA_DIR` as a persistent deployment, but the auth choice does not.
Fix: in `readEnv`, throw when `dataDir` is set without `authSecret`. Better, delete the unsigned resolver from every non-test build.

**H2. No production entrypoint or deploy artifact.** See items 1 and 2 above. The service binds `127.0.0.1` by default (`server.ts:65`), and `bin.ts:20-31` passes no `host`, `allowedHosts` or `allowedOrigins`. A container cannot be reached, and a reverse proxy's Host header is rejected by `guard.ts:23-25`.
Fix: add `BRAIN_HOST`, `BRAIN_ALLOWED_HOSTS` and `BRAIN_ALLOWED_ORIGINS` to `readEnv` and pass them through. Add a non-demo path in `bin.ts` that loads connectors and an embedder from config. Add a multi-stage Dockerfile: Node 22+ slim, `pnpm deploy --prod`, a non-root user, a `/data` volume and a `HEALTHCHECK`.

**H3. No key rotation and no revocation.** `auth/token.ts:46` takes one secret. The token `user:tenant:exp:hmac` (`token.ts:6`) carries no key id. Rotating the secret logs out every user at once. A leaked token cannot be revoked short of that.
Fix: add a key id, as in `kid.user.tenant.exp.hmac`. Accept a map `{kid: secret}` from `BRAIN_AUTH_SECRETS`, sign with the newest key and verify with any listed key. For revocation, add a per-tenant `not_before` epoch and reject tokens whose issue time precedes it. That needs an `iat` field.

**H4. Audit database and anchor log default to the working directory.** `config.ts:20-21` defaults to `brain-audit.db` and `brain-anchors.log`, not paths under `BRAIN_DATA_DIR`. In a container the working directory is ephemeral. A restart erases the audit chain, the one store that cannot be rebuilt from sources.
Fix: default both to `join(dataDir, "audit.db")` and `join(dataDir, "anchors.log")`. Refuse to start in non-demo mode when either path is outside a configured volume.

**H5. No timeouts on external calls.** `app.ts:51` awaits `deps.embedQuery(text)` with no deadline. `app.ts:37-38` passes `embed` and `fetchText` to the index service unwrapped. `connector-runtime/src/runtime.ts:34` awaits `connector.list` with no deadline. One hung embedding API holds every MCP request open. Only the live ACL path has a deadline (`query-service/src/service.ts:49`).
Fix: wrap each injected async dependency in `AbortSignal.timeout(ms)` at the composition root (`app.ts`), with config values such as `BRAIN_EMBED_TIMEOUT_MS`. Map a timeout to a typed error and a 504-style JSON-RPC error.

## MED

**M1. Shutdown leaves 3 of 4 SQLite handles open.** `app.ts:69-71` closes only `registry`. The search index, cursor store and audit chain expose no `close()` (`features/hybrid-search/src/index.ts`, `features/change-cursor/src/store.ts:5-12`, `features/audit-chain/src/store.ts:18-28`). The write-ahead log (WAL) files are never checkpointed on exit.
Fix: add `close()` to `SearchIndex`, `CursorStore` and the audit `Store`. Run `PRAGMA wal_checkpoint(TRUNCATE)` then `db.close()` in each. Call all of them in `app.close()`.

**M2. Shutdown kills in-flight requests and can hang.** `server.ts:72-78` calls `closeAllConnections()` right after `sessions.closeAll()`, so a search mid-flight is cut. `bin.ts:41` has no force-exit timer. The signal handlers register only after startup ingest (`bin.ts:42-43`). The process has no `unhandledRejection` handler.
Fix: stop accepting, mark readiness false, drain for up to `BRAIN_SHUTDOWN_GRACE_MS` (default 10 s), then close connections. Add `setTimeout(() => process.exit(1), grace).unref()`. Register signal handlers before ingest.

**M3. No request rate limit per principal.** `limits.ts:15` caps sessions (1,000 total, 20 per principal) but not calls. One principal can loop `search` inside one session. Each call costs an embedding API call and up to `limit` connector reads on the live ACL path.
Fix: add a token bucket keyed by `(tenantId, id)` in `server.ts` before `handleRequest`, and answer 429 with `Retry-After`. Add a per-tenant bucket as well.

**M4. Token lifetime, or time-to-live (TTL), has no upper bound.** `token.ts:37` accepts any positive `ttlSeconds`. `token.ts:56` checks only `now >= exp`. A 10-year token minted by mistake is accepted.
Fix: reject on verify when `exp - now > MAX_TTL_SECONDS` (for example 24 h). Cap `ttlSeconds` in `mintToken` too.

**M5. The search index trusts a caller-supplied SQL string for tenant scoping.** `fts.ts:20`, `vec.ts:18,37,45` interpolate `acl.sql` directly. `index-db.ts:57` only checks that it is non-empty. Today every caller builds it with `allowClause`, which binds `tenant_id = ?` (`acl-filter/src/clause.ts:15`). A future caller passing `"1"` reads every tenant.
Fix: make `search` take `{ tenantId, principal }` and build the clause inside `hybrid-search`. Or prepend a fixed `chunks.tenant_id = ? AND` that the index binds itself.

**M6. Each vector search scans the chunk table twice, across all tenants.** `vec.ts:21-22` runs `count(*)` over all chunks and then over the ACL-filtered set, with `json_each` per row. `node:sqlite` is synchronous, so these scans block the event loop. The vec0 KNN is global (`vec.ts:25-27`), so a small tenant in a large index often falls to `exactScan`.
Fix: cache the totals per tenant and invalidate on write. Longer term, use one vec0 partition per tenant (a `tenant_id` partition key column) or one index file per tenant.

**M7. Busy timeouts block the event loop for up to 30 s.** `DatabaseSync` is synchronous. The busy timeouts are 30 s in `audit-chain/src/store.ts:34`, 10 s in `pointer-registry/src/registry.ts:24` and 5 s in `change-cursor/src/store.ts:20`. Lock contention stalls every request in the process.
Fix: one process owns the files, so set all three to about 1 s and fail fast. Move ingestion writes to a worker thread.

**M8. Changing the embedding model corrupts the index.** `vec.ts:8` creates `chunks_vec` with the dimension from the first run. `IF NOT EXISTS` keeps the old dimension after a model change. The new probe dimension (`app.ts:24`) passes validation and then fails on insert.
Fix: store the dimension and model id in a `meta` table. Refuse to start on mismatch, with a documented reindex command.

**M9. No backups.** All stores run in WAL mode. Copying the `.db` file alone misses the `-wal` content. The audit chain cannot be rebuilt, and the pointer registry and search index rebuild only by re-fetching every source document.
Fix: a scheduled `VACUUM INTO '/backup/<name>-<ts>.db'` per file, or Litestream to object storage. Add a restore runbook and a restore test in CI.

**M10. Audit anchors are never written, and they sit next to the data they guard.** `bin.ts` never calls `app.checkpoint`. With no anchor, `verify` cannot detect truncation of the newest rows. When anchors are written, they go to a local file (`audit-service/src/file-store.ts:13`) without fsync. An attacker with disk access can edit both files.
Fix: checkpoint each tenant on a timer and on shutdown. Ship anchors to append-only storage off the host, such as an S3 bucket with object lock.

**M11. Logging is half structured.** `runtime/logger.ts:3-5` writes JSON, but `bin.ts:9,16,34-39` writes plain text through `console`. `bin.ts:35-36` logs document addresses, which can carry file paths and titles. The HTTP layer logs only 500s (`server.ts:59`). There is no access log, request id, latency or status code.
Fix: route everything through `defaultLogger`. Log one line per request with request id, tenant, status and duration, and never the query or token. Hash or drop document addresses.

**M12. Horizontal scaling is unsafe.** Ingestion mutual exclusion is an in-process `WeakMap` lock (`runtime.ts:13,25`). Two replicas on shared storage would interleave cursor writes. SQLite on network storage is unsafe in any case.
Fix: document a single-replica constraint in the deploy artifact (`replicas: 1`, `Recreate` strategy). Add a file lock (`flock` on `dataDir`) at startup so a second process refuses to start.

**M13. Ingestion retries have no backoff and no scheduler.** `deliver.ts:42` counts attempts. A retry happens only on the next `runOnce`, and `bin.ts` never calls it again. A source outage quarantines items after 3 runs, with no time spacing between them.
Fix: run ingestion on an interval with jitter. Retry inside a run with exponential backoff on transient errors such as 429 and 5xx. Honour `Retry-After` from connectors.

## LOW

**L1. Expiry is indistinguishable from a bad token.** `server.ts:30-32` maps every resolver error, including `TokenExpiredError`, to a bare 401 with no `WWW-Authenticate` header.
Fix: send `WWW-Authenticate: Bearer error="invalid_token"`, with `error_description="expired"` for expiry.

**L2. Secrets come only from plain env vars.** `readEnv` (`config.ts:14`) checks length only. Nothing stops `BRAIN_AUDIT_KEY` from equalling `BRAIN_AUTH_SECRET`.
Fix: support `BRAIN_AUTH_SECRET_FILE` for mounted secrets. Reject equal keys. Reject values with low character variety.

**L3. A config error crashes with a stack trace.** `bin.ts:7` calls `readEnv` outside the `try` that guards `resolveAuditKey`.
Fix: wrap `readEnv` like `resolveAuditKey`, print `brain: <message>`, and exit 1. Validate all `BRAIN_*` vars in one schema.

**L4. Node HTTP timeouts are left at defaults.** `server.ts:56` sets no `requestTimeout`, `headersTimeout` or `keepAliveTimeout`. The defaults are 300 s and 60 s.
Fix: set `requestTimeout` to about 30 s and `headersTimeout` to about 10 s.

**L5. Quarantine ids are cut to 16 hex characters.** `failures.ts:6` keys dead letters by a 64-bit prefix. A collision makes `isDead` skip an unrelated document within that tenant.
Fix: store the full event id. The 4,096-character cursor cap still holds 20 entries.

**L6. The audit key cannot rotate.** `governance/src/digest.ts:10` derives every digest from one master key. A new key makes old digests unlinkable to new ones.
Fix: record a key id in each audit row's `detail`.

**L7. Seen-event pruning crosses tenants.** `change-cursor/src/store.ts:57` deletes expired rows for all tenants. This is correct for a TTL expiry but is the only unscoped statement in the repo. Keep it, with a comment saying the cross-tenant scope is intended.

## Tenant isolation: statement-by-statement result

| File:line | Statement | Scoped |
| --- | --- | --- |
| `pointer-registry/src/schema.ts:31-36` | one, insert, update, page, tombstone | yes, `tenant_id = ?` |
| `audit-chain/src/store.ts:43-46` | last, insert, page, all | yes |
| `change-cursor/src/store.ts:49-58` | get, set, seen, forget | yes |
| `change-cursor/src/store.ts:57` | prune | no, by design (L7) |
| `hybrid-search/src/search/db.ts:33,40,46` | removeDoc, setAcl | yes |
| `hybrid-search/src/search/db.ts:16` | hydrate by rowid | rowids come from tenant-filtered lists |
| `hybrid-search/src/search/fts.ts:18-21`, `vec.ts:16-19,43-46` | search | only through caller `acl.sql` (M5) |
| `hybrid-search/src/search/vec.ts:21` | `count(*)` total | no, read-only, not returned (M6) |
| `query-service/src/service.ts:23-26` | registry re-check | yes, second line of defence |

## Auth: what passes

- Constant-time compare: `token.ts:53-55` decodes both MACs to bytes, checks length, then calls `timingSafeEqual`.
- No ambiguity in what is signed: the regex at `token.ts:6` forbids `:` in user and tenant, so `user:tenant:exp` has one parse.
- Minimum secret length of 32 characters is enforced twice (`config.ts:15`, `token.ts:18`).
- Signature is checked before expiry, so expiry timing reveals nothing about unsigned input.
- Groups are always `[]` (`token.ts:57`). Group-based access rules never match through the HTTP path. That is a functional gap, not a leak.

## CI gaps

| Gap | Where | Fix |
| --- | --- | --- |
| No container build or image scan | `ci.yml` | Build the Dockerfile and scan it with Trivy or Grype |
| No smoke test of the shipped binary | `ci.yml` | Start `dist/bin.js`, mint a token, call `/mcp` and `/healthz` |
| Node 26 only; `engines` says `>=22` | `ci.yml:16,33`, `package.json:7` | Add a matrix for 22 and 26, since `node:sqlite` changed across those versions |
| Actions pinned by tag, not commit hash (SHA), in a job with `contents: write` and `packages: write` | `release.yml:4-7,15-26` | Pin each action to a commit SHA |
| gitleaks downloaded with `curl` and no checksum | `ci.yml:43-44` | Verify the download's hash (SHA-256), or use the pinned gitleaks action |
| No SAST | `ci.yml` | Add CodeQL for JavaScript and TypeScript |
| No publish provenance; software bill of materials (SBOM) unsigned | `release.yml:23-30` | Publish with `--provenance`; sign the SBOM with cosign |
| No backup and restore test | none | Restore a `VACUUM INTO` copy, then run `verify` on the audit chain |

## Recommended order

1. Fix H1 (refuse unsigned tokens with a data dir) and H4 (audit paths under the data dir). Both are a few lines in `config.ts` and `bin.ts`.
2. Build the production entrypoint, host and allowed-host config, Dockerfile, `/healthz` and `/readyz` (H2).
3. Add timeouts on external calls (H5) and full shutdown with WAL checkpoints (M1, M2).
4. Add key ids, max TTL and a `not_before` revocation epoch (H3, M4).
5. Add backups, the anchor timer, and schema version with dimension checks (M8, M9, M10).
6. Add rate limits, request logs and metrics (M3, M11).
7. Close the CI gaps.

## Method

The review read every source file under `apps/brain/src` and `services/*/src`. It also read every feature file that runs SQL: `acl-filter`, `pointer-registry`, `audit-chain`, `change-cursor` and `hybrid-search`. It covered the governance and retrieval audit paths and both workflows. No code was run. Line numbers refer to the files as of 2026-11-02.
