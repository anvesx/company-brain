63%

# Company Brain

Company Brain is a graph of who and what a company knows: people, teams, documents, repos and the links between them, stored as metadata only. Retrieval of real text (RAG) is a separate product in [anvesx/rag](https://github.com/anvesx/rag); connectors are in [anvesx/connectors](https://github.com/anvesx/connectors) (ADR 0005). This repo holds the graph-only brain app, the connections app and the shared contracts.

## Why we are building it

Most company search tools copy everything into their own store. That creates three problems.

- **Stale answers.** The copy drifts from the source until someone re-syncs it.
- **Leaked access.** A copy has to re-implement every app's permission rules. When a document is unshared at the source, the copy often still returns it.
- **Terms of service.** Some vendors, Slack among them, restrict persistent third-party copies of their data.

Storing only pointers and ACLs removes the copy. Freshness comes from webhooks, delta cursors, a polling backstop and a reconciliation sweep. Access comes from the user's own token, checked live on the top results.

## Architecture

The repo is a pnpm and Turborepo monorepo. A package may depend only on tiers below it, and `tools/structure-lint` enforces that.

| Tier     | Packages                                                                         | Depends on         |
| -------- | -------------------------------------------------------------------------------- | ------------------ |
| features | change-cursor, connector-kit, core-types, graph-store, query-router, zone-policy | nothing            |
| services | graph-sync                                                                       | features           |
| apps     | brain, connections                                                               | services, features |

**Brain.** `apps/brain` serves who can read what from a metadata graph in one SQLite file (`graph-store`), filled by `graph-sync` from connector metadata and ACLs. It never holds document text, chunks or embeddings (ADR 0004).

**Connections.** `apps/connections` manages connected accounts and OAuth, and reads the connector catalog from `@anvesx/connectors`.

The full design is in [docs/brain](docs/brain). Decisions are in [docs/adr](docs/adr), per-package specs in [docs/specs](docs/specs), and review findings in [docs/reviews](docs/reviews).

## Conventions

- Files are at most 80 lines. A folder holds at most 5 files, and its README counts as one of them.
- Every package has `src/`, `tests/` and a README describing the feature in depth.
- Every folder under `src/`, `tests/`, `bin/` and `scripts/` has its own README, except a folder that holds only JSON fixtures.
- Tests live in the package's `tests/` folder beside `src/`, never inside `src/`.
- `pnpm structure` prints how many packages, files and folders it checked.
- Specs come first, then failing tests, then code. Existing libraries are used wherever they exist, including `node:sqlite`.
- Testing covers unit, integration and mutation (Stryker, break at 80).
- CI, Changesets versioning and Lefthook commit hooks are configured. Commits use conventional messages.

## Run it

```bash
pnpm install
pnpm turbo run typecheck
pnpm turbo run test --concurrency=2
pnpm structure
pnpm guard:fakes
```

The two apps install `@anvesx/connectors` 0.1.0 from GitHub Packages. Set `NODE_AUTH_TOKEN` to a token with `read:packages` before running `pnpm install`.

## Progress

The percentage on the first line is computed in [docs/progress.md](docs/progress.md): working software over the committed backlog.

**Real and tested here:** graph-store, graph-sync, query-router, zone-policy, change-cursor, connector-kit, core-types, the brain app and the connections app.

**Not built yet:** validity and supersession of facts, memory distillation, governance (erasure, tenant keys), the evaluation harness, the capture daemon and the action agent. Live checks against real GitHub and Drive accounts have not run.

Ticketing runs on the [Company Brain board](https://github.com/orgs/anvesx/projects/7). Known gaps are in [docs/reviews](docs/reviews).
