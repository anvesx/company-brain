63%

# DevX Brain (Company Brain)

Living design page with the full drill-down and 43 cited sources: [DevX Brain artifact](https://claude.ai/artifact/WZQCzHZ47E2XPs9UH7j55Z?sk=XEcuQR72uONWUNz3RPY_lA).

## 1. What it is

Shared memory for a company's people and their AI agents. An agent asks over the Model Context Protocol (MCP) and gets the right chunks of the right documents, only those the asker may see.

- **Pointer index.** For each document it stores address, version, content hash, access list and search vectors. The document stays in its app and is fetched live.
- **Two kinds of people connect apps.** The admin connects company apps once. Each employee can also connect their own accounts and choose who may use them.
- **Retrieval is separate.** RAG lives in [anvesx/rag](https://github.com/anvesx/rag), connectors in [anvesx/connectors](https://github.com/anvesx/connectors) (ADR 0005). This repo holds the graph-only brain app, the connections app and shared contracts.
- **Proposed, not built:** exact message vault, backup before delete, leaver pipeline, laptop folder agent.

## 2. Why we are building it

| Failure today          | What the brain does                                                     |
| ---------------------- | ----------------------------------------------------------------------- |
| Stale answers          | Fetches the live document and compares its version to the pointer.      |
| Leaked access          | Filters by the source's access list, then rechecks with the user token. |
| Repeated work          | Searches every connected app and shows who solved it.                   |
| Lost knowledge         | Proposed: keep exact words, back up before delete, hand over work.      |
| Conflicting documents  | Proposed: score sources, discount copied claims, weigh by trust.        |

## 3. User flows

1. **Admin connects an app:** sign in, pick app and least-access scope, connector reads, pointers land, admin sees counts.
2. **Employee connects own account:** consent, set who may use it, set who may read what syncs. Private data is owner-only.
3. **Employee asks an agent:** MCP call as the employee, narrow by access list, live recheck, cited chunks, audit entry.
4. **Document changes:** webhook or cursor, compare hash, update pointer and vectors, mark dependents stale.
5. **Person leaves:** cut access, hand files to the manager, keep or erase by policy, write a receipt.

## 4. The solution in steps

1. Admin and employees connect apps with least access.
2. Changes arrive by webhook, cursor or nightly sweep; store pointer, hash, access list, vectors.
3. Proposed: an LLM sorts documents into categories; the strictest sets permission.
4. A person or agent asks through MCP, signed in as themselves.
5. The access list narrows candidates; the live app confirms; the agent gets cited chunks.

## 5. What is done

Two measures, counting different things: **63%** is 26 of 41 committed units (6 Nov); **5.7%** is 75 of 1,306 rebuild items (13 Nov), the stricter one.

| Feature             | Status                                                              |
| ------------------- | ------------------------------------------------------------------- |
| Connect to apps     | Code exists for admin and employee connections. Vault 0 of 36.      |
| Catch changes       | Code exists. job-queue 0 of 37.                                     |
| Pointer index       | Code exists. Rag keeps its registry in memory (board issue 50).     |
| Permissions, zones  | Code exists. Visibility gate 0 of 53, audit log 0 of 27.            |
| Search and answer   | hybrid-search mutation score 73.81, break line 80. No citations yet. |
| Agent interface     | brain-mcp exists. mcp-service mutation run not green.               |

## 6. Architecture

pnpm and Turborepo monorepo. A package may depend only on tiers below it; `tools/structure-lint` enforces that.

| Tier     | Packages                                                                         |
| -------- | -------------------------------------------------------------------------------- |
| features | change-cursor, connector-kit, core-types, graph-store, query-router, zone-policy |
| services, apps | graph-sync; brain, connections |

`apps/brain` serves who can read what from a metadata graph in one SQLite file, never document text (ADR 0004). `apps/connections` manages connected accounts and OAuth. Design: [docs/brain](docs/brain). Decisions: [docs/adr](docs/adr). Specs: [docs/specs](docs/specs).

## 7. Research

43 sources, cited in the artifact: company-brain posts, SECI (Nonaka 1994, 1995, 2025 to 2026 papers), IBM (SmallBlue, APQC, watsonx), truth discovery, permissioned retrieval, agent memory. Notes: [docs/brain/research](docs/brain/research).

## Run it

```bash
pnpm install
pnpm turbo run typecheck
pnpm turbo run test --concurrency=2
pnpm structure
pnpm guard:fakes
```

Set `NODE_AUTH_TOKEN` (`read:packages`) first: the apps install `@anvesx/connectors` 0.1.0 from GitHub Packages. Files stay at most 80 lines; specs first, then failing tests, then code; mutation break at 80. Line 1 comes from [docs/progress.md](docs/progress.md).
