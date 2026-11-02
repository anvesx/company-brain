# cli

Turns environment variables into a metadata sync.

- `connector.ts` picks the source (`BRAIN_CONNECTOR`: folder, github or drive) and checks its settings.
- `sync.ts` runs graph-sync for `BRAIN_TENANT` into the graph at `BRAIN_GRAPH_PATH`. It reads titles, addresses, versions and access lists, never document text.

Run it with `brain sync`, then start the API with `brain`.
- `recheck.ts` turns on the per-query source check when `BRAIN_USER_TOKENS_FILE` points at a JSON map `{user: {source: token}}`. Each answer is then confirmed with the asker's own token; a user with no token gets nothing from that source.
