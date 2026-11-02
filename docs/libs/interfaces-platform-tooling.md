# Libraries: interfaces, platform, tooling (L4, L5 and monorepo)

Verified 2026-11-01 with `npm view`, `gh api repos/...` and PyPI JSON. Stars and last push are GitHub values. "NOASSERTION" means GitHub could not detect one SPDX license; the npm or PyPI license is shown in the text. pnpm 8.15.0 runs on Node v26.0.0 locally (verified). Node 26 support below is read from each package's `engines` field unless a row says "ran"; nothing here was executed on Node 26 beyond pnpm itself. Anything not checked is marked unverified.

## 1. MCP server exposing search tools (llm.mcp)

| Candidate | Version | License | Stars | Last push | Verdict |
|---|---|---|---|---|---|
| @modelcontextprotocol/server (+ @modelcontextprotocol/hono 2.0.2, @modelcontextprotocol/node 2.1.2) | 2.4.0 | Apache-2.0 (npm) | 13,693 (monorepo) | 2026-10-31 | Pick. Official v2 split packages; engines >=20 |
| @modelcontextprotocol/sdk | 1.32.2 | MIT (npm); repo is mid-transition MIT to Apache-2.0 | 13,693 | 2026-10-31 | Fallback. Still npm `latest` tag, engines >=18 |
| fastmcp | 4.23.8 | MIT | 3,284 | 2026-10-27 | Reject. Third-party wrapper over the SDK, adds a dependency layer we do not need |
| @hono/mcp | 0.3.5 | MIT | 32,771 (hono repo) | 2026-10-28 | Reject. Pre-1.0, official @modelcontextprotocol/hono covers it |

PICK: `@modelcontextprotocol/server@2.4.0` + `@modelcontextprotocol/hono@2.0.2`. Why: official, Apache-2.0 on npm, current major, mounts on the same Hono app as REST so auth and metering are shared. Fallback if v2 API churn bites: `@modelcontextprotocol/sdk@1.32.2`. We write: `packages/mcp/src/tools.ts` registering `search`, `fetch_live`, `cite` tools whose input schemas are the same zod schemas the REST routes use, each handler a one-line call into the L2 query service. Unverified: the `engines` field of @modelcontextprotocol/hono and /node was not read; the v1 to v2 migration effort was not measured.

## 2. HTTP API (REST)

| Candidate | Version | License | Stars | Last push | Verdict |
|---|---|---|---|---|---|
| hono | 4.13.16 | MIT | 32,771 | 2026-11-01 | Pick. engines >=16.9, web-standard Request/Response |
| @hono/node-server | 2.1.5 | MIT | (hono org) | unverified | Pick as the Node adapter, engines >=20 |
| @hono/zod-openapi | 1.6.3 | MIT | (hono org) | unverified | Pick. Routes from zod, generates OpenAPI |
| @hono/zod-validator | 0.9.1 | MIT | (hono org) | unverified | Skip, zod-openapi supersedes it |
| fastify | 5.12.7 | MIT | 37,338 | 2026-11-01 | Alternative. Mature, but needs fastify-type-provider-zod 7.0.0 and @fastify/swagger 9.9.3 for the same result |
| express | 5.3.0 | MIT | unverified | unverified | Reject. No built-in schema or OpenAPI story |

PICK: `hono@4.13.16`, `@hono/node-server@2.1.5`, `@hono/zod-openapi@1.6.3`. Why: one framework serves REST and MCP, runs on Node 26 or edge unchanged, OpenAPI for the agent-facing tool schemas comes free. We write: `apps/api/src/app.ts` (route table, auth middleware that resolves the asking user token from L3, per-tenant meter middleware, error mapper) and `GET /openapi.json`.

## 3. Schema validation and config

| Candidate | Version | License | Stars | Last push | Verdict |
|---|---|---|---|---|---|
| zod | 4.6.7 | MIT | 44,241 | 2026-10-30 | Pick |
| valibot | 1.5.0 | MIT | unverified | unverified | Reject. Smaller, but hono-openapi, drizzle-zod and MCP tooling target zod |
| @sinclair/typebox | 0.34.52 | MIT | unverified | unverified | Reject, pre-1.0 and last modified 2026-07 |
| envalid | 9.0.0 | MIT | unverified | unverified | Reject, zod already parses env |
| @t3-oss/env-core | 0.13.11 | MIT | 4,022 | 2026-04-01 | Reject, thin wrapper over zod, quiet since April |
| dotenv | 18.0.9 | BSD-2-Clause | unverified | unverified | Skip, use `node --env-file` on Node 26 (unverified for 26 specifically, documented since Node 20.6) |

PICK: `zod@4.6.7`. Why: one schema source for API, MCP tool inputs, env and DB-insert checks. We write: `packages/config/src/env.ts`, a ~30 line `z.object({...}).parse(process.env)` that fails fast on boot, and `packages/schemas` for shared request and citation types.

## 4. ORM and migrations

| Candidate | Version | License | Stars | Last push | Verdict |
|---|---|---|---|---|---|
| drizzle-orm | 0.45.4 | Apache-2.0 | 36,197 | 2026-10-30 | Pick |
| drizzle-kit | 0.31.11 | MIT | (same repo) | 2026-10-30 | Pick for migrations |
| kysely | 0.29.8 | MIT | unverified | unverified | Alternative, query builder only, no migrations-from-schema, engines >=22 |
| prisma | 8.0.0-rc.29 | Apache-2.0 | unverified | unverified | Reject, release candidate only on the version checked |

PICK: `drizzle-orm@0.45.4` + `drizzle-kit@0.31.11`. Why: SQL-first, supports the Postgres and pgvector columns L0 to L2 need (pgvector support: unverified, check before L2), no codegen step at runtime. Both are 0.x, pin exact versions. We write: `packages/db/src/schema/*.ts` (pointer registry, ACL, audit tables), `drizzle.config.ts`, and a `withTenant(tx, tenantId)` helper.

## 5. LLM gateway with metering

| Candidate | Version | License | Stars | Last push | Verdict |
|---|---|---|---|---|---|
| LiteLLM proxy | 1.106.6 (PyPI, GitHub release v1.106.6) | MIT (PyPI); GitHub shows NOASSERTION because of a separate enterprise directory | 62,495 | 2026-11-01 | Pick, run as a container. Python >=3.10 <3.15 |
| Portkey gateway | not checked on npm | MIT | 13,300 | 2026-05-25 | Reject. Last push 5 months ago |
| openai (TS client) | 7.47.0 | Apache-2.0 | unverified | unverified | Pick as the client; engines >=22 |
| @anthropic-ai/sdk | 1.3.0 | Apache-2.0 | unverified | unverified | Not needed if every call goes through the gateway |

PICK: LiteLLM proxy `1.106.6` as a sidecar container, called from TS with `openai@7.47.0` and `baseURL` set to the gateway. Why: per-key and per-team budgets, spend logs and model fallback are built in, which is the L4 "metered and capped per user" requirement. We write: a virtual-key-per-tenant provisioner (calls the proxy key API), a `litellm.config.yaml`, and `packages/llm/src/client.ts` that adds the `user` and `metadata.tenant` fields to every call. Unverified: budget enforcement behaviour under concurrent calls; which budget features sit behind the enterprise license.

## 6. Agent loop

| Candidate | Version | License | Stars | Last push | Verdict |
|---|---|---|---|---|---|
| ai (Vercel AI SDK) | 7.0.159 | Apache-2.0 (npm); repo NOASSERTION | 27,676 | 2026-11-01 | Pick. engines >=22 |
| @ai-sdk/mcp | 2.0.88 | Apache-2.0 | (vercel/ai) | 2026-11-01 | Pick, consumes our own MCP tools in the loop |
| @openai/agents | 0.21.0 | MIT | 3,957 | 2026-11-01 | Alternative, 0.x, OpenAI-shaped |
| @mastra/core | 1.81.0 | Apache-2.0 (npm); repo NOASSERTION | 29,255 | 2026-11-01 | Reject. Full framework (memory, workflows); L1 already has durable workflows |

PICK: `ai@7.0.159` + `@ai-sdk/mcp@2.0.88`. Why: provider-agnostic `generateText` with tool calling and step limits is the whole loop, it accepts the LiteLLM endpoint as an OpenAI-compatible provider (the `@ai-sdk/openai-compatible` package was not checked, unverified). We write: `packages/agent/src/answer.ts` (~100 lines: pack context, call with tools, enforce max steps and token cap, post-check that every claim has a citation) and the injection-defence wrapper that strips tool-call syntax from retrieved text.

## 7. Observability

| Candidate | Version | License | Stars | Last push | Verdict |
|---|---|---|---|---|---|
| @opentelemetry/sdk-node | 0.300.0 | Apache-2.0 | 3,515 | 2026-11-01 | Pick. engines >=22.15, so Node 26 is in range |
| @opentelemetry/api | 1.10.0 | Apache-2.0 | (same repo) | 2026-11-01 | Pick |
| pino | 10.4.0 | MIT | 18,284 | 2026-10-06 | Pick |
| langfuse / @langfuse/client | 3.39.2 / 6.1.0 | MIT | 36,838 | 2026-11-01 | Optional later. Server repo shows NOASSERTION (enterprise folder, unverified), self-host needs extra services |

PICK: `@opentelemetry/sdk-node@0.300.0`, `@opentelemetry/api@1.10.0`, `pino@10.4.0`. Why: vendor-neutral traces and metrics, pino logs carry trace ids. We write: `packages/telemetry/src/init.ts` (SDK start, OTLP exporter, resource attributes `tenant.id`), a Hono middleware that opens a span per request and per MCP tool call, and a pino mixin that adds trace and span id. LLM cost and token counts come from LiteLLM spend logs, joined on trace id. Unverified: pino instrumentation package versions.

## 8. Retrieval-quality and answer evals (L5)

| Candidate | Version | License | Stars | Last push | Verdict |
|---|---|---|---|---|---|
| promptfoo | 0.125.1 | MIT | 26,692 | 2026-11-01 | Pick. engines >=22.22.0, fine on 26 |
| ragas | 0.4.3 (PyPI only, no npm package) | Apache-2.0 | 16,204 | 2026-02-24 | Reject for CI. Python, last push 8 months ago |

PICK: `promptfoo@0.125.1`. Why: declarative YAML test sets, a custom `javascript` provider can call our REST API, assertions include citation checks and injection-resistance cases, and the same file runs the leak probe. We write: `evals/promptfooconfig.yaml`, a provider `evals/provider.ts` hitting `/v1/answer`, a 20-line `recallAtK` assertion over the 100-question set (expected source ids per question), and a CI step failing below the agreed recall at 20. ragas metrics (context precision, faithfulness) can be added later via a Python job; not needed for the L2 exit test.

## 9. Monorepo task runner

| Candidate | Version | License | Stars | Last push | Verdict |
|---|---|---|---|---|---|
| turbo | 2.11.10 | MIT | 31,292 | 2026-10-31 | Pick |
| nx | 24.0.3 | MIT | 29,442 | 2026-10-31 | Reject. More power (generators, graph UI), more config surface than a pnpm workspace needs |

PICK: `turbo@2.11.10`. Why: reads pnpm workspaces, caching of build, test and lint with a 20 line config. We write: `turbo.json` (tasks `build`, `test`, `lint`, `typecheck`, with `dependsOn: ["^build"]`) and root scripts. Unverified: pnpm 8.15 compatibility (turbo supports pnpm workspaces; the exact minimum was not checked).

## 10. Versioning and publishing

| Candidate | Version | License | Stars | Last push | Verdict |
|---|---|---|---|---|---|
| @changesets/cli | 3.0.3 | MIT | 12,551 | 2026-11-01 | Pick. engines explicitly include >=26 |
| semantic-release | 25.0.9 | MIT | 24,150 | 2026-10-31 | Reject. Commit-message driven, awkward for many independently versioned feature packages |

PICK: `@changesets/cli@3.0.3`. Why: per-package versions and changelogs, a PR bot flow, native pnpm workspace support. We write: `.changeset/config.json` (access restricted, `ignore` for apps), a CI job running `changeset version` then `changeset publish`.

## 11. Private package registry (feature packages)

| Candidate | Version | License | Stars | Last push | Verdict |
|---|---|---|---|---|---|
| GitHub Packages (npm registry) | hosted service | n/a | n/a | n/a | Pick |
| verdaccio | 7.0.2 | MIT | 17,965 | 2026-11-01 | Alternative. engines >=24, so Node 26 fine, but we run and back up a server |

PICK: GitHub Packages. Why: no server to run, auth through the existing GitHub org and `GITHUB_TOKEN` in CI. We write: `.npmrc` (`@anvesx:registry=https://npm.pkg.github.com`), `publishConfig` in each package, a CI token with `packages:write`. Constraints (unverified, from memory of the docs): packages must be scoped to the org name, and consumers need a token with `read:packages`. Choose Verdaccio only if customers must install without GitHub accounts.

## 12. Test stack

| Candidate | Version | License | Stars | Last push | Verdict |
|---|---|---|---|---|---|
| vitest | 5.0.5 | MIT | 17,323 | 2026-11-01 | Pick. engines ^22.12, ^24, >=26 |
| @stryker-mutator/core + vitest-runner | 10.1.1 | Apache-2.0 | 3,309 | 2026-10-30 | Pick. engines >=22 |
| @playwright/test | 1.64.1 | Apache-2.0 | 99,046 | 2026-10-31 | Pick. engines >=20 |
| k6 | v2.3.0 (Go binary, not npm) | AGPL-3.0 | 32,101 | 2026-10-29 | Pick for load. Running the binary in CI does not link it into our code; get a license read before bundling it in a product |
| autocannon | 8.0.0 | MIT | 8,535 | 2026-05-16 | Reject. npm last modified 2024-10, push May 2026, no scenario scripting |

PICKS: `vitest@5.0.5`; `@stryker-mutator/core@10.1.1` + `@stryker-mutator/vitest-runner@10.1.1` (run on changed packages only, nightly full run); `@playwright/test@1.64.1` for the admin and OAuth consent flows; k6 v2.3.0 via the `grafana/k6` container for 10k to 100k document scale runs. We write: `vitest.workspace.ts`, `stryker.config.mjs` with `thresholds.break`, `playwright.config.ts`, and `load/search.js` k6 scenario with p95 thresholds. Unverified: Stryker mutation run time on our repo; Vitest 5 plus Stryker runner version pairing beyond the shared 10.1.1 number.

## 13. Lint, format, commit lint

| Candidate | Version | License | Stars | Last push | Verdict |
|---|---|---|---|---|---|
| @biomejs/biome | 2.6.4 | MIT OR Apache-2.0 | 26,033 | 2026-11-01 | Pick |
| eslint | 10.14.0 | MIT | 27,603 | 2026-11-01 | Reject for now. engines ^20.19 / ^22.13 / >=24; needs typescript-eslint plus prettier 3.9.10 |
| @commitlint/cli + config-conventional | 21.2.4 | MIT | 18,794 | 2026-11-01 | Pick. engines >=22.12 |
| lefthook | 2.2.2 | MIT | 8,968 | 2026-10-26 | Pick for git hooks |
| husky | 9.1.7 | MIT | unverified | unverified | Reject, lefthook runs hooks in parallel with no shell shim |

PICK: `@biomejs/biome@2.6.4` (lint and format in one tool, no plugin set), `@commitlint/cli@21.2.4` + `@commitlint/config-conventional@21.2.4`, `lefthook@2.2.2`. We write: `biome.json`, `commitlint.config.mjs` (one line extends), `lefthook.yml` (pre-commit biome check on staged files, commit-msg commitlint). Gap: Biome has no type-aware lint rules equal to typescript-eslint (unverified); `tsc --noEmit` through turbo covers types.

## 14. CI dependency scanning, secret scanning, SBOM

| Candidate | Version | License | Stars | Last push | Verdict |
|---|---|---|---|---|---|
| osv-scanner | v2.7.0 | Apache-2.0 | 11,346 | 2026-10-31 | Pick for dependencies (reads pnpm-lock) |
| trivy | v0.76.1 | Apache-2.0 | 38,892 | 2026-11-01 | Add for container images (LiteLLM, our API) |
| gitleaks | v8.30.1 | MIT | 30,569 | 2026-10-28 | Pick for secrets |
| trufflehog | not checked | AGPL-3.0 | 28,816 | 2026-11-01 | Reject, AGPL and gitleaks suffices |
| @cyclonedx/cdxgen | 12.9.0 | Apache-2.0 | 1,102 | 2026-11-01 | Pick for SBOM. engines includes ^26 |
| syft | v1.55.0 | Apache-2.0 | 9,809 | 2026-11-01 | Alternative, better for images |
| @cyclonedx/cyclonedx-npm | 6.0.1 | Apache-2.0 | unverified | unverified | Reject, npm lockfile oriented, pnpm support unverified |

PICK: `osv-scanner v2.7.0`, `gitleaks v8.30.1`, `@cyclonedx/cdxgen@12.9.0` (CycloneDX JSON per release), `trivy v0.76.1` on images. We write: `.github/workflows/security.yml` running osv-scanner on `pnpm-lock.yaml`, gitleaks on PR diffs plus a lefthook pre-commit, `cdxgen -t js -o sbom.cdx.json` attached to each release, trivy image scan. Unverified: cdxgen and osv-scanner handling of a pnpm 8 lockfile (lockfileVersion 6); test on the first PR.

## Summary of picks

| Need | Pick |
|---|---|
| MCP | @modelcontextprotocol/server@2.4.0, @modelcontextprotocol/hono@2.0.2 |
| HTTP | hono@4.13.16, @hono/node-server@2.1.5, @hono/zod-openapi@1.6.3 |
| Schema, config | zod@4.6.7 |
| ORM | drizzle-orm@0.45.4, drizzle-kit@0.31.11 |
| LLM gateway | LiteLLM 1.106.6 container, openai@7.47.0 client |
| Agent loop | ai@7.0.159, @ai-sdk/mcp@2.0.88 |
| Observability | @opentelemetry/sdk-node@0.300.0, @opentelemetry/api@1.10.0, pino@10.4.0 |
| Evals | promptfoo@0.125.1 |
| Task runner | turbo@2.11.10 |
| Versioning | @changesets/cli@3.0.3 |
| Registry | GitHub Packages |
| Unit, mutation, e2e, load | vitest@5.0.5, @stryker-mutator/core@10.1.1, @playwright/test@1.64.1, k6 v2.3.0 |
| Lint, commits | @biomejs/biome@2.6.4, @commitlint/cli@21.2.4, lefthook@2.2.2 |
| Scanning, SBOM | osv-scanner v2.7.0, gitleaks v8.30.1, @cyclonedx/cdxgen@12.9.0, trivy v0.76.1 |
