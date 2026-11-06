# Architecture decision records

Each ADR records one decision. Numbers never change, so links stay stable when a
decision is amended. ADRs live in theme folders, and each folder holds at most five files.

| ADR | Title | Status | Folder |
| --- | --- | --- | --- |
| [0001](product/0001-tiers-and-limits.md) | Four tiers, small files, few files per folder | accepted | [product](product) |
| [0003](product/0003-connector-sourcing.md) | Connector sourcing | proposed | [product](product) |
| [0004](boundaries/0004-rag-and-brain-are-separate.md) | RAG and brain are separate apps | accepted, 2026-11-02 | [boundaries](boundaries) |
| [0005](boundaries/0005-connectors-and-rag-move-to-own-repos.md) | Connectors and RAG move to their own repos | accepted, 2 Nov 2026 | [boundaries](boundaries) |
| [0006](boundaries/0006-rank-and-reindex-move-to-rag.md) | Rank, reindex and the rank scale test move to rag | accepted, 3 Nov 2026 | [boundaries](boundaries) |
| [0007](tooling/0007-package-root-files-count.md) | Package-root files count toward the five-file limit | accepted, 3 Nov 2026 | [tooling](tooling) |
| [0008](product/0008-identity-on-better-auth.md) | Identity on one auth library that also serves MCP OAuth | accepted, 6 Nov 2026 | [product](product) |
| [0009](product/0009-connector-oauth-on-better-auth.md) | Connector sign-in and token refresh on better-auth account linking | accepted, 6 Nov 2026 | [product](product) |
| [0010](tooling/0010-deploy-cloud-run-postgres.md) | Deploy on Cloud Run with Cloud SQL Postgres; AWS second | proposed, 6 Nov 2026 | [tooling](tooling) |

## Folders

- `product/`: scope, tiers and sourcing rules for the product.
- `boundaries/`: which app owns which part, and the repo moves that enforce it.
- `tooling/`: rules the structure lint enforces.

ADR 0006 amends ADR 0005. ADR 0009 amends ADR 0003 and the connections app spec. ADR 0008 amends the identity pick in `docs/libs/permissions-security.md`. Earlier records are kept as written.
