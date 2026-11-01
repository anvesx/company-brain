# Architecture

Company Brain is a pointer-only knowledge index. It stores where a document is, who may see it,
and a hash of it. It fetches the text live with the asking user's own token.
Design source: [docs/brain](../brain) (14 stages, 28 groups, 152 components).

## Build order: features, services, modules, app

| Tier | Folder | Job | May depend on | Published |
|---|---|---|---|---|
| Feature | `features/*` | One reusable capability, built on a library | `features/core-types`, third-party only | Yes, to the registry |
| Service | `services/*` | Composes features into one runnable unit with a port | features | Yes |
| Module | `modules/*` | A product area made of services | services, features | No |
| App | `apps/*` | The deployable that wires modules | modules | No |
| Tool | `tools/*` | Repo tooling (lint, scripts) | nothing in the tiers | No |

Rule: dependencies point down only. A feature never imports another feature. Shared shapes live in
`features/core-types`. `tools/structure-lint` fails CI when a rule breaks.

## Folder rules (enforced)

1. One file does one job. 80 lines max per file.
2. At most 5 files in a folder. Split into sub-folders, never into longer files.
3. Every package has `src/`, `tests/` and a `README.md`. Every source folder has a `README.md`.
4. Tests sit beside the code they test, in `tests/`, split by kind: `unit`, `integration`,
   `mutation`, `e2e`, `scale`.
5. Docs outside a package go in `docs/`.

## Reuse first

We integrate, we do not reimplement. Picks and evidence: [docs/libs](../libs).
A feature is a thin adapter over a library, plus tests that pin its behaviour.

## Quality gates

Unit, integration, mutation (Stryker, score at least 80), e2e (Playwright), scale (k6),
structure-lint, typecheck, secret scan. A feature is done only when all of its gates are green.
After every 5 features land, Opus and Codex review them (see [process](../agents/PROCESS.md)).
