# @brain/ingestion

Connector to index pipeline. Spec: `docs/specs/module/ingestion.md`. Composes `@brain/connector-runtime` and `@brain/index-service`; it adds no core logic.

## Interface

```ts
const ingestion = createIngestion({
  runtime: { cursors, clock, pageSize, maxAttempts }, // RuntimeDeps without the sink and connector
  indexService, // @brain/index-service
  connectorFor: (tenantId) => connectors.get(tenantId), // undefined for an unknown tenant
  tokenFor: (tenantId) => tokens.get(tenantId),
});
const { emitted, indexed, failed, failures, quarantined } = await ingestion.runOnce("tenant-1");
```

`docId(connectorId, address)` returns the pointer id used for a document.

## Behaviour

- Each changed document is fetched for its content hash, turned into a pointer (ACL, zone and times from the listing) and applied as an upsert.
- First run indexes all documents. A rerun emits none. A new version emits one.
- The connector and the credential are resolved per tenant by `connectorFor` and `tokenFor`. If either returns undefined, `runOnce` throws `IngestionError` `UNKNOWN_TENANT` before touching anything. A resolver must never return one tenant's connector for another tenant.
- A failing document does not stop the run. It is counted in `failed` and listed in `failures` (`{address, error}`); the other documents are indexed and the delete pass still runs. A caller must check `failures`: an empty list is the only full success.
- A failed document is retried on the next runs (the runtime re-lists from the start). After `maxAttempts` runs (default 3) it is quarantined: skipped, and returned in `quarantined` on every run, until a new version or ACL arrives.
- A changed ACL at an unchanged version is a new event and is re-indexed.
- After a run that listed every page from the start (document failures do not prevent this; a connector error does), documents this process indexed earlier but that are no longer listed get a delete event (tombstone).
- Counts: `emitted` is events sent to the index (upserts and deletes, including failed ones); `indexed` is events applied as created, updated or deleted; `failed` is rejected events (one per failed document attempt or delete). A failed delete is reported in `failures` and retried on the next full run.
- Other runtime errors (`INVALID_INPUT`, `BAD_CURSOR_LOOP`, connector errors) propagate unchanged.

## Limits

- Delete detection relies on in-memory state. After a process restart, documents deleted while it was down stay indexed until re-indexed. Persisting the known set needs a registry listing the module may not read.
- A run resumed from a saved mid-scan cursor does not detect deletes; the next full run does.
- A file deleted and re-added at the same version within the runtime's seen-id ttl (24 h) is not re-emitted.
- `runOnce` calls for one tenant are serialised (a second call waits); different tenants run in parallel. The lock is in-process.
- Each changed document is fetched twice: once here for the content hash, once by the index service through its own `fetchText`. `IndexService.apply` takes a pointer only, so the text cannot be passed through without changing that package. If the source changes between the two fetches, the stored hash does not match the indexed text until the next version.

## Test

`pnpm --filter @brain/ingestion test`, `typecheck`, `mutation`. Tests use in-memory databases. Build the dependencies first: core-types, change-cursor, chunker, connector-kit, hybrid-search, pointer-registry, connector-runtime, index-service.
