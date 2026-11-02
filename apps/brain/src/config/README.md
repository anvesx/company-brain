# src/config

| File       | Job                                                                                                                                                                    |
| ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `env.ts`   | `readEnv`: port, bind host, allowed hosts and origins, data dir, signing secret, folder root, tenant. Throws when `BRAIN_DATA_DIR` is set without `BRAIN_AUTH_SECRET`. |
| `ops.ts`   | `readOps`: timeouts (`BRAIN_EMBED_TIMEOUT_MS`, `BRAIN_EMBED_QUERY_TIMEOUT_MS`, `BRAIN_FETCH_TIMEOUT_MS`, `BRAIN_LIST_TIMEOUT_MS`), drain, force-exit and health port.  |
| `demo.ts`  | `demoDeps`: the demo connector (tenant acme), toy embeddings, `embedText`.                                                                                             |
| `index.ts` | Barrel for the above.                                                                                                                                                  |

The audit DB and anchor log default to `audit.db` and `anchors.log` inside `BRAIN_DATA_DIR`.
