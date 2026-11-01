# @brain/brain-app

The runnable Devx Brain server. Spec: `docs/specs/app/brain.md`. It composes ingestion, governed search and the MCP server; it adds no core logic.

```ts
const app = await createBrainApp({
  connectorFor: (tenantId) => connectors.get(tenantId), // undefined for an unknown tenant
  tokenFor: (tenantId) => tokens.get(tenantId),
  cursors, // optional: defaults to a file in dataDir, else in memory
  dataDir, // optional: registry, search index and cursors on disk
  logger, // optional: { error, warn, info }; default JSON lines on stderr
  clock,
  embed,
  embedQuery,
  fetchText, // optional: default reads through the tenant's connector with the tenant credential
  userTokenFor, // optional: turns on the live ACL (see below)
  liveAclTimeoutMs, // optional: how long the live check may take; default 2000 (query-service)
  principalFor,
  auditDbPath,
  anchorPath,
  transport: "http",
  port: 0,
});
const { failures, quarantined } = await app.ingest("tenant-1"); // tenant connector -> index; check failures
await app.search({ query, principal }); // audited, same path as MCP
await app.verify("tenant-1"); // audit chain check
await app.checkpoint("tenant-1"); // anchor, so truncation is detectable
await app.close(); // idempotent, frees the port
```

## Behaviour

- Every search, whether over MCP or `app.search`, goes through governance and writes one audit row.
- ACL, tenant and tombstone rules come from the query service. Unauthenticated HTTP gets `401`.
- With `dataDir` (env `BRAIN_DATA_DIR`) the registry, search index and cursor store are files there, so ingested docs stay searchable and are not re-emitted after a restart. Without it they are in memory.
- MCP search failures are logged through `logger` (cause name and message only, never query text, principal or token); the client still sees only `Search failed`.
- Vector size is measured by embedding one probe text at startup unless `dimension` is given.

## Live ACL

Set `userTokenFor(principal)` (the user's own credential at the source) and every search re-checks each hit at the source: the connector fetches the document with the user's token (`createConnectorLiveAcl` from `@brain/retrieval`). A read that succeeds keeps the hit; `NOT_FOUND` drops it; any other error, a missing token, an unknown tenant or a timeout fails closed. If nothing can be verified, `app.search` rejects with `RetrievalError` code `LIVE_ACL` and MCP clients see `Search failed`; no audit row is written. Successful live searches write the same audit rows as governed ones, built through `@brain/retrieval`. Without `userTokenFor`, search uses the cached ACL and governance as before.

Cost: the check fetches the full document for each hit. Fine for a handful of hits per search, expensive for large documents.

## Run

`BRAIN_DEMO=1 BRAIN_PORT=3000 node dist/bin.js`. Without `BRAIN_DEMO=1` it exits 1, since no real connector is wired. Other variables: `BRAIN_AUDIT_DB`, `BRAIN_ANCHOR`, `BRAIN_DATA_DIR`, `BRAIN_AUTH_SECRET`.

## Auth

Bearer token: `<user>:<tenant>:<hmac-sha256-hex(secret, "user:tenant")>`, checked in constant time; a missing or bad signature is unauthenticated. `BRAIN_AUTH_SECRET` must be at least 32 characters or startup fails. Mint with the exported `mintToken(secret, user, tenant)`. Demo mode only: with `BRAIN_DEMO=1` and no secret, the forgeable unsigned `Bearer alice:acme` is accepted. Set a secret in anything reachable by others.

## Limits

- `@brain/retrieval` cannot take an injected search function, so the app starts `@brain/mcp-service` directly. Governed search (no live ACL) uses governance, whose sync query path cannot run a live verifier; live search composes retrieval's `toOutcomeFn`, `auditedOutcome` and `toSearchFn` instead.
- `truncated` (candidate cap hit) is not exposed by `app.search`, which returns pointers only.
- `bin.ts` does not configure `userTokenFor`; the live ACL is a library option.
- After a restart with `dataDir`, the first full-listing run seeds ingestion's known set from the registry's live pointers (`runtime/known.ts`, paged with `afterId`), so documents deleted at source while the app was down are tombstoned. Without `dataDir` the registry starts empty, so there is nothing to seed. A run that does not list everything (connector error, resume from a saved cursor) tombstones nothing.
- `dataDir` must be reused with the same embedding dimension; changing it needs a fresh directory.

## Test

`pnpm test`, `pnpm typecheck`, `pnpm mutation` from this folder. Build the dependencies first.
