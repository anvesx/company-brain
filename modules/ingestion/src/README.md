# Source layout

- `ingestion.ts` runs the connector runtime with a sink that applies upserts to the index service, then tombstones documents that vanished from a full listing.
- `listing.ts` wraps a connector to record one run's listing and whether it saw every page.
- `pointer.ts` builds the stable pointer id and the pointer from event, listing metadata and text hash.
- `types.ts` holds the public types.
- `index.ts` exposes the supported package API.

All runtime imports use ESM `.js` suffixes.
