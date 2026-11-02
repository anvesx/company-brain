# cli

Turns environment variables into a metadata sync.

- `connector.ts` picks the source (`BRAIN_CONNECTOR`: folder, github or drive) and checks its settings.
- `sync.ts` runs graph-sync for `BRAIN_TENANT` into the graph at `BRAIN_GRAPH_PATH`. It reads titles, addresses, versions and access lists, never document text.

Run it with `brain sync`, then start the API with `brain`.
