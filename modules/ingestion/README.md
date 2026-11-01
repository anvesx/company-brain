# @brain/ingestion

Connector to index pipeline. Spec: `docs/specs/module/ingestion.md`. Composes `@brain/connector-runtime` and `@brain/index-service`; it adds no core logic.

## Interface

```ts
const ingestion = createIngestion({
  runtime: { connector, cursors, clock, pageSize }, // RuntimeDeps without the sink
  indexService, // @brain/index-service
});
const { emitted, indexed, failed } = await ingestion.runOnce("tenant-1");
```

`docId(connectorId, address)` returns the pointer id used for a document.

## Behaviour

- Each changed document is fetched once for its content hash, turned into a pointer (ACL, zone and times from the listing) and applied as an upsert.
- First run indexes all documents. A rerun emits none. A new version emits one.
- An index failure stops the run and returns `failed: 1`. The runtime does not advance its cursor, so the next run retries.
- After a run that listed every page from the start without failure, documents this process indexed earlier but that are no longer listed get a delete event (tombstone).
- Counts: `emitted` is events sent to the index (upserts and deletes, including failed ones); `indexed` is events applied as created, updated or deleted; `failed` is rejected events. A failed delete is retried on the next full run.
- Other runtime errors (`INVALID_INPUT`, `BAD_CURSOR_LOOP`, connector errors) propagate unchanged.

## Limits

- Delete detection relies on in-memory state. After a process restart, documents deleted while it was down stay indexed until re-indexed. Persisting the known set needs a registry listing the module may not read.
- A run resumed from a saved mid-scan cursor does not detect deletes; the next full run does.
- A file deleted and re-added at the same version within the runtime's seen-id ttl (24 h) is not re-emitted.
- One `runOnce` per tenant at a time.

## Test

`pnpm --filter @brain/ingestion test`, `typecheck`, `mutation`. Tests use in-memory databases. Build the dependencies first: core-types, change-cursor, chunker, connector-kit, hybrid-search, pointer-registry, connector-runtime, index-service.
