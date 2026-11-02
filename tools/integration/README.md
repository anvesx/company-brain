# @anvesx/integration

Cross-package integration tests over the real packages: `connector-kit`, `graph-sync`, `graph-store`, `change-cursor`, `rank`, `zone-policy` and `core-types`. No mocks, no fakes, no in-memory databases. Every SQLite file is in a temp directory the test creates and removes. Documents come from the real folder connector over a temp folder.

## Run

```sh
pnpm install
pnpm turbo run build --filter=@anvesx/integration^...   # the packages resolve through dist
pnpm --filter @anvesx/integration run integration
```

The script is named `integration`, not `test`, so the CI `verify` job (`run test`) does not run these twice; the CI `integration` job runs them through `turbo run integration` and fails if no package defines that task.

## Scenarios

| Folder                      | Scenario                                                                                                                                                                                                                         | Status                  |
| --------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- |
| `tests/integration/feed`    | folder connector, then graph-sync into graph-store, then rank indexes the graph's documents and a search returns their pointers                                                                                                  | real                    |
| `tests/integration/acl`     | an asker without the principal gets zero hits for a document another asker sees; `graph-store.reach` agrees; group grant through `member-of`; narrowed ACL                                                                       | real                    |
| `tests/integration/zone`    | `zone-policy` `canSee` gates what rank returns (personal, team, company); `promote` needs the owner's consent                                                                                                                    | real, with gaps 1 and 2 |
| `tests/integration/resume`  | graph-sync aborted after two pages, process state reopened, run again: no duplicate or lost node; cursor and dedupe survive                                                                                                      | real, with gap 3        |
| `tests/integration/delete`  | a deleted source file is tombstoned in the graph and leaves search                                                                                                                                                               | real, with gap 4        |
| `tests/integration/reindex` | an index step that throws leaves the pass to retry (`known` changes only after index and remove commit); a node without `updatedAt` is still indexed; a revoked reader is dropped although the connector version ignores the ACL | real                    |

A zone change without an edit (company to personal) reindexes the document, because `zoneGate` puts the zone into the version `reindex` diffs (`tests/integration/zone/demote.test.ts`, which also covers `team:` readers).

`src/` holds the two glue steps no package offers yet (graph to rank, zone to readers). They are the code under test as much as the packages are.

## Gaps in the public APIs

Where a scenario could not be wired as briefed, the test covers the nearest real path.

1. No package links graph-sync's `zone` prop to rank. `rank` has no zone concept, only opaque principals. `src/zone-gate.ts` narrows readers with `canSee`; the test supplies the zone.
2. The folder connector reports every document as `personal`, so the zone of each document is chosen by the test from its path, not read from the graph.
3. `graph-sync` takes no cursor: every run lists the whole connector from the start and diffs against the graph. "Resume" is therefore an abort, a reopen of the graph file and a full re-run that converges, not a continue from page N. `change-cursor` is used for what it offers: a checkpoint that survives reopen, and `seen` dedupe of replayed events. Nothing in graph-sync reads that cursor.
4. `rank` has no way to list its ids, and nothing tells it a document was tombstoned. `src/reindex.ts` keeps a `known` map and uses `diffListing` to find deletions. If the caller skips the graph pass, the index keeps the document (second test in `delete`).
5. `graph-sync` writes `member-of` edges only when the connector implements `listMemberships`; the folder connector does not, so the group test adds the edge with `graph-store.addEdge`, as an identity feed would.
6. `connector-kit` marks the folder connector `enforcesUserToken: false`. These tests do not cover a live, source-side ACL check.
