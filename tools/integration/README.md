# @anvesx/integration

Cross-package integration tests over the real packages: `connector-kit`, `graph-sync`, `graph-store`, `change-cursor`, `zone-policy` and `core-types`. No mocks, no fakes, no in-memory databases. Every SQLite file is in a temp directory the test creates and removes. Documents come from the real folder connector over a temp folder.

Rank and the reindex step moved to the rag repo (ADR 0006). The graph side stops at a listing, `sourceDocs`, in the shape rag's `@rag/reindex` takes. The graph-to-rank end-to-end run is not tested in either repo (see Gaps).

## Run

```sh
pnpm install
pnpm turbo run build --filter=@anvesx/integration^...   # the packages resolve through dist
pnpm --filter @anvesx/integration run integration
```

The script is named `integration`, not `test`, so the CI `verify` job (`run test`) does not run these twice; the CI `integration` job runs them through `turbo run integration` and fails if no package defines that task.

## Scenarios

| Folder                     | Scenario                                                                                                                                                       | Status                  |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- |
| `tests/integration/feed`   | folder connector, then graph-sync into graph-store, then `sourceDocs` lists the documents with address, version and readers                                    | real                    |
| `tests/integration/acl`    | the listing's readers agree with `graph-store.reach`; group grant through `member-of`; a narrowed ACL drops the reader                                         | real                    |
| `tests/integration/zone`   | `zone-policy` `canSee` decides which readers `zoneGate` keeps (personal, team, company); `promote` needs the owner's consent; a zone change moves the gate tag | real, with gaps 1 and 2 |
| `tests/integration/resume` | graph-sync aborted after two pages, process state reopened, run again: no duplicate or lost node; cursor and dedupe survive                                    | real, with gap 3        |
| `tests/integration/delete` | a deleted source file is tombstoned in the graph and leaves the listing                                                                                        | real, with gap 4        |

`src/` holds the glue no package offers yet (graph to listing, zone to readers).

## Gaps in the public APIs

1. No package links graph-sync's `zone` prop to rank. `zoneGate` narrows readers with `canSee`; the test supplies the zone.
2. The folder connector reports every document as `personal`, so the test chooses each document's zone from its path.
3. `graph-sync` takes no cursor: every run lists the whole connector from the start and diffs against the graph. "Resume" is an abort, a reopen of the graph file and a full re-run that converges. `change-cursor` is used for a checkpoint that survives reopen and `seen` dedupe.
4. Nothing tells the index a document was tombstoned. Without the graph pass the listing keeps the document (second test in `delete`); rag's reindex finds deletions by diffing the listing against its `known` map.
5. `graph-sync` writes `member-of` edges only when the connector implements `listMemberships`; the group test adds the edge with `graph-store.addEdge`, as an identity feed would.
6. `connector-kit` marks the folder connector `enforcesUserToken: false`. These tests do not cover a live, source-side ACL check.
7. No test runs graph, then `@rag/reindex`, then rank search across both repos. The two halves meet at the `SourceDoc` shape, which is copied, not shared.
