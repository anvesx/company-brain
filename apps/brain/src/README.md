# src

| File        | Job                                                                                     |
| ----------- | --------------------------------------------------------------------------------------- |
| `app.ts`    | `createBrainApp`: wires stores, ingestion, governance and the MCP server.               |
| `types.ts`  | `BrainDeps`, `BrainApp`, `SearchInput`.                                                 |
| `config.ts` | `readEnv` and the demo connector (bound to tenant acme only), embeddings and principal. |
| `bin.ts`    | Process entry: env config, demo ingest, graceful shutdown.                              |
| `index.ts`  | Public exports.                                                                         |
