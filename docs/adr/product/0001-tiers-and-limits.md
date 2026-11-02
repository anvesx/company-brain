# ADR 0001: Four tiers, small files, few files per folder

Status: accepted.

Context: the brain will be reused in other projects, built by several agents at once.
Agents collide on big files and tangled imports.

Decision:
- Four tiers (feature, service, module, app) with downward-only dependencies.
- Features depend only on `core-types` so each can be published and reused alone.
- 80 lines per file, 5 files per folder, enforced by `tools/structure-lint`.
- TypeScript on Node, pnpm workspaces, Turborepo, Changesets.

Consequences: many small folders. Each needs a README, which the lint checks.
A folder that grows past 5 files is split by responsibility.
