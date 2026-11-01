89%

# Company Brain

Company Brain connects to the apps a company already uses and lets people and LLMs ask questions across all of them. It keeps an index of pointers to documents. It does not keep a copy of the documents. When a question arrives, it fetches the real text from the source app at that moment, using the asking user's own permissions.

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

**Interfaces.** The `brain` app serves the search tool over MCP. Bearer tokens are `user:tenant:exp:hmac`.

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

Run the scale test with `SCALE_ENGINE=k6 pnpm --filter @brain/scale-test scale:node`. The last run at 50 virtual users gave a p95 of 18 ms with no failed requests.

## Progress

The percentage on the first line is the share of the 19 goals set for this project that are met. It stands at 17 of 19.

Not yet met:

- **Ticketing on a GitHub Project.** Issues exist under anvesx/company-brain. The Projects v2 board needs the `project` scope on the `rachit-srivastava-devx` login.
- **Qwen Coder as a builder.** It needs a fresh login. Kiro and Codex now build headless, alongside Claude.

Known gaps in the code are listed in [docs/reviews](docs/reviews). The main ones are paging that can skip hits when documents change mid-search, a per-instance index lock, and tokens that carry no groups or key id.
