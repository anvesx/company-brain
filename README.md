18%

# Company Brain

Company Brain is meant to be a graph of who and what a company knows: people, teams, documents, repos and the links between them, stored as metadata only. A separate retrieval app (RAG) fetches real text when an agent asks. Today the repo contains the retrieval half and the first graph building blocks. The graph-only brain app is not built yet; see [docs/reviews/brain-vs-rag-gap.md](docs/reviews/brain-vs-rag-gap.md).

## Why we are building it

Most company search tools copy everything into their own store. That creates three problems.

- **Stale answers.** The copy drifts from the source until someone re-syncs it.
- **Leaked access.** A copy has to re-implement every app's permission rules. When a document is unshared at the source, the copy often still returns it.
- **Terms of service.** Some vendors, Slack among them, restrict persistent third-party copies of their data.

Storing only pointers, embeddings and ACLs removes the copy. Freshness comes from webhooks, delta cursors, a polling backstop and a reconciliation sweep. Access comes from the user's own token, checked live on the top results.

## Architecture

The repo is a pnpm and Turborepo monorepo with four tiers. A package may depend only on tiers below it, and `tools/structure-lint` enforces that.

| Tier     | Packages                                                                                                                     | Depends on                  |
| -------- | ---------------------------------------------------------------------------------------------------------------------------- | --------------------------- |
| features | acl-filter, audit-chain, change-cursor, chunker, connector-kit, core-types, hybrid-search, mcp-search-tool, pointer-registry | nothing                     |
| services | audit-service, connector-runtime, index-service, mcp-service, query-service                                                  | features                    |
| modules  | governance, ingestion, retrieval                                                                                             | services, features          |
| apps     | brain                                                                                                                        | modules, services, features |

Features and services are built to be published to a registry and reused in other projects, so they carry as few cross-dependencies as possible.

**Write path.** A connector lists documents and their ACLs. Ingestion compares each one with the pointer registry by version and content hash. The index service fetches the text, checks its sha-256 against the pointer, chunks it, embeds it and swaps the chunks into the search index in one transaction. A failed update leaves the old chunks searchable.

**Read path.** A search runs BM25 and vector search together, fused by reciprocal rank. The ACL filter runs inside both queries, so a hit the user cannot see is never ranked. The cached ACL runs first. A live check with the user's token can only narrow the result. Every search writes one row to a hash-chained audit log.

**Interfaces.** The `brain` app is the retrieval server today and will be renamed `rag`. It serves the search tool over MCP. Bearer tokens are `user:tenant:exp:groups:kid:sig`, with key rotation and a 24 hour cap.

The full design is in [docs/brain](docs/brain). Decisions are in [docs/adr](docs/adr), per-package specs in [docs/specs](docs/specs), and review findings in [docs/reviews](docs/reviews).

## Conventions

- Files are at most 80 lines. A folder holds at most 5 files plus its README.
- Every package has `src/`, `tests/` and a README describing the feature in depth.
- Specs come first, then failing tests, then code. Existing libraries are used wherever they exist, including `node:sqlite`, FTS5, `sqlite-vec`, the MCP SDK and `json-canonicalize`.
- Testing covers unit, integration, mutation (Stryker, break at 80), end to end, and scale (k6 and autocannon).
- CI, Changesets versioning and Lefthook commit hooks are configured. Commits use conventional messages.

## Run it

```bash
pnpm install
pnpm -r build
pnpm -r --no-bail --workspace-concurrency=1 test
pnpm integration
```

Run the scale test with `SCALE_ENGINE=k6 pnpm --filter @anvesx/scale-test scale:node`.

## Progress

The percentage on the first line is the share of the 152 designed components that exist and are tested. It is 18% because the retrieval path is built and the graph path is mostly not. Counting process goals gave 100% earlier, which overstated it.

**Real and tested:** folder, GitHub and Drive connectors on the official SDKs (GitHub and Drive tested against replay servers only), a real 384-dimension embedder, SQLite pointer registry, FTS5 and sqlite-vec search, the ACL filter, the hash-chained audit log, the MCP server, and the features graph-store, query-router and zone-policy.

**Not built yet:** the graph-only brain app, graph-sync from connectors, validity and supersession of facts, memory distillation, governance (erasure, tenant keys), the evaluation harness, the capture daemon and the action agent. Live checks against real GitHub and Drive accounts have not run. The Docker image has not been verified in CI.

Ticketing runs on the [Company Brain board](https://github.com/orgs/anvesx/projects/7). Known gaps are in [docs/reviews](docs/reviews).
