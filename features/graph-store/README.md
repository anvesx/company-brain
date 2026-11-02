# @anvesx/graph-store

Metadata-only property graph for the brain app, in one SQLite file (`node:sqlite`). Nodes and typed edges carry a tenant id on every row and one caller-supplied validity axis (`validFrom`/`validTo`): a changed fact closes the old row instead of overwriting it. There is no recorded-at axis, so the store cannot answer what it believed at an earlier time; it is not bi-temporal. No document text, no embeddings (ADR 0004).

Spec: `docs/specs/feature/graph-store.md`. Decision: `docs/adr/0004-rag-and-brain-are-separate.md`.

## Use

```ts
import { createGraphStore } from "@anvesx/graph-store";

const g = createGraphStore({ path: "/var/brain/graph.db" });
g.upsertNode(
  { tenant: "t1", id: "doc:1", kind: "document", source: "gdrive", address: "files/1", title: "Plan", version: "3", props: { owner: "ana" } },
  Date.now(),
);
g.addEdge({ tenant: "t1", from: "user:ana", to: "doc:1", kind: "can-read", source: "gdrive" }, Date.now());
g.reach("t1", "user:ana", { kinds: ["can-read", "member-of"], depth: 3, limit: 100 });
g.close();
```

## Behaviour

- Every read and write is scoped by tenant. Another tenant sees nothing.
- `validFrom`/`validTo` are caller-supplied numbers (the `at` argument). `validTo = null` means current. `asOf` returns the row with `validFrom <= asOf < validTo`. Rows are never deleted.
- `upsertNode` with identical content is a no-op. Changed content closes the current row at `at` and inserts a new one. An `at` earlier than the current row's `validFrom` throws `BAD_INPUT`. Upserting a tombstoned id revives it.
- `addEdge` is idempotent per `(tenant, from, to, kind)` while current; the first `source` wins. `removeEdge` sets `validTo`. Edges may point at nodes that do not exist yet.
- `tombstone` closes the node and every current edge touching it, in one transaction. A removal dated before the add leaves an edge that was never visible.
- `neighbors` returns both directions unless `dir` is given, in insertion order.
- `reach` follows outgoing edges of the given kinds, breadth-first, cycle-safe, never returns the start node. Missing nodes are skipped and not expanded. `depth` is 0 to 6 (more throws `DEPTH_LIMIT`), `limit` caps the result size.
- `tombstone` dated before the current row's `validFrom` throws `BAD_INPUT`, like `upsertNode`; nothing changes.
- `props` are metadata only (ADR 0004); see Limits. Body-like keys throw `BAD_INPUT`: `text`, `body`, `content`, `summary`, `excerpt`, `transcript`, `snippet`, `markdown`, `payload`, `message`, `preview`, `abstract`, `rawtext`, `htmlbody`, compared without case or punctuation. This is a denylist; the size limits are what bound smuggling under other keys. See `src/validation/README.md`.
- After `close()` every call, including a second `close()`, throws `CLOSED`. SQLite removes the `-wal` and `-shm` files when the last handle closes.
- `path: ":memory:"` is refused unless `NODE_ENV=test` or running under vitest.

## Limits

All sizes are UTF-8 bytes. Over a limit, `upsertNode` throws `BAD_INPUT` and stores nothing.

| Field                          | Limit                                 |
| ------------------------------ | ------------------------------------- |
| `title`                        | 512                                   |
| `address`                      | 2048                                  |
| `version`                      | 256                                   |
| `source`                       | 128                                   |
| props entries                  | 32                                    |
| props key                      | `[A-Za-z][A-Za-z0-9_.-]*`, at most 64 |
| props value                    | 1024                                  |
| props total (keys plus values) | 4096                                  |

No field or prop value may contain control characters (newline, tab, NUL, DEL): a multi-line value is body text.

## Concurrency

WAL mode, 10 s busy timeout, writes inside `BEGIN IMMEDIATE`. Several processes may write one file. A handle must not be shared between threads.

## Develop

```sh
pnpm --filter @anvesx/graph-store test
pnpm --filter @anvesx/graph-store mutation   # Stryker, break below 80
```

Out of scope: entity resolution, connector sync, LLM extraction, Kuzu.
