# Brief: deploy

Spec: [docs/specs/infra/deploy.md](../specs/infra/deploy.md). ADR: 0010. Lead decision (C1): **build-new**, thin, on
`pg@8.23.1` (MIT) and the existing `@anvesx/identity` (already takes a kysely dialect or a `pg.Pool`; no change there).

## Owner's rules (every builder)
- No stubs, fakes or placeholder data. No test written just to be green. OSI-licensed libraries only.
- Minimal hand-written code; inline comments a junior can read. Each file under 80 lines, at most 5 files per
  folder plus a `README.md` in every folder. `pnpm structure` must pass.
- Commit subject lower case (commitlint), body lines at most 100 columns, no attribution lines.
- Never bypass hooks (no `--no-verify`). Never commit `dist/`, `.env*`, `*.db` or any token.
- Do not edit the lead-owned tests: `features/graph-store/tests/{contract,postgres,support/pg}/**`, `tools/deploy/tests/**`.
- Token for installs: `NODE_AUTH_TOKEN=$(cat <token file>) pnpm install`. Never print it, never put it in a file.

## Order and owners
| Brief | Builder | Owns (only these) | Red tests that define done |
|---|---|---|---|
| B1 Postgres dialect | mid-engineer (Sonnet) | `features/graph-store/src/postgres/**`, `src/async.ts`, `src/index.ts` (exports), `src/validation/**` (NUL and surrogate rule), `src/README.md` | `features/graph-store/tests/contract/*`, `tests/postgres/*` (60 tests) plus the existing suite |
| B2 serve + image | mid-engineer (Sonnet), after B1 merges | `apps/brain/src/serve/**`, `apps/brain/src/{app.ts,bin.ts,index.ts,README.md}`, `apps/brain/src/gate/access.ts`, `apps/brain/tests/serve/**` (new, own tests), `apps/brain/package.json`, `Dockerfile`, `.dockerignore` | `tools/deploy/tests/workflow/dockerfile.test.ts`, `tools/deploy/tests/image/*` |
| B3 workflow + CI | junior-engineer (Haiku) | `.github/workflows/image.yml`, `.github/workflows/ci.yml` (Postgres path only) | `tools/deploy/tests/workflow/image-workflow.test.ts` |
| V | verifier (Sonnet) | nothing | reruns everything below from a clean worktree; PASS or FAIL |

B3 can run in parallel with B1. Coordination: the "brain on identity port" slice also touches `apps/brain`; B2 starts from
whichever lands first and rebases, it never reverts the other slice.

## B1: Postgres dialect (one session)
1. `src/async.ts`: `AsyncGraphStore` (mapped type in the spec) and `toAsync(store)`; wrap each call in
   `Promise.resolve().then(() => store[m](...))` so sync throws become rejections.
2. `src/postgres/schema.ts`: DDL mirroring SQLite (`text` columns, `double precision` times, `jsonb` not needed: keep
   props as `text` holding sorted JSON so round-trips are byte-identical). Run it in one transaction after
   `SELECT pg_advisory_xact_lock(<constant>)`.
3. `src/postgres/{nodes,edges,reach}.ts`: same SQL as SQLite with `$n` placeholders. Upsert: `BEGIN`, advisory xact lock on
   `(hashtext(tenant), hashtext(id))`, read current, close it, insert, `COMMIT`. Edge add: `ON CONFLICT ... DO NOTHING`.
   Reach: iterative BFS with one `= ANY($2)` query per level (no per-node round trip).
4. `src/postgres/store.ts`: `createPostgresGraphStore({ pool })`: `pool.on("error", log)`, run DDL (rejects if unreachable),
   return the store; `close()` flips a flag, never calls `pool.end()`.
5. Validation (both dialects): reject NUL (`\u0000`) and `!s.isWellFormed()` in every text input with `BAD_INPUT`.
6. Add `pg` to `src/README.md` reuse notes. Update `features/graph-store/README.md` with the async API.

## B2: brain serve entry and image (one session)
1. Move `app.ts` and `gate/access.ts` to `AsyncGraphStore` (`await` each store call). The old sync CLI path wraps
   `createGraphStore` in `toAsync`.
2. `src/serve/serve.ts`: read env (spec), one `pg.Pool` from `DATABASE_URL`, `migrateDatabase` + `createIdentity` with
   `{ dialect: new PostgresDialect({ pool }) }`, `createPostgresGraphStore({ pool })`, listen on `HOST:PORT`.
   `src/serve/health.ts`: `/healthz` per spec. `src/serve/mount.ts`: route `/api/auth/*` and `/.well-known/*` to the
   identity Hono app (`@hono/node-server`'s `getRequestListener`), `/healthz` to health, the rest to the brain handler.
3. `bin.ts`: `brain serve` runs `serve.ts`; the existing default stays for local SQLite use.
4. `Dockerfile` stages:
   | Stage | Base | Does |
   |---|---|---|
   | `deps` | `node:26-slim` | `npm i -g pnpm@8.15.0`; copy lockfile, workspace yaml and every `package.json`; `RUN --mount=type=secret,id=npm_token NODE_AUTH_TOKEN=$(cat /run/secrets/npm_token) pnpm install --frozen-lockfile` |
   | `build` | `deps` | copy sources; `pnpm turbo run build --filter=@anvesx/brain...` |
   | `prod` | `build` | `pnpm --filter @anvesx/brain deploy --prod /out` (same secret mount) |
   | `runtime` | `node:26-slim` | `WORKDIR /app`, `COPY --from=prod --chown=node:node /out .`, `USER node`, `ENV NODE_ENV=production PORT=8080`, `EXPOSE 8080`, `HEALTHCHECK CMD node -e "fetch('http://127.0.0.1:8080/healthz').then(r=>process.exit(r.ok?0:1),()=>process.exit(1))"`, `CMD ["node","dist/bin.js","serve"]` |
5. `.dockerignore`: `**/dist`, `**/node_modules`, `.git`, `.env*`, `**/*.db`, `**/coverage`, `**/reports`.
   Node 26, not ADR's 22: CI and dev run 26, and corepack is gone from Node 25+, hence `npm i -g pnpm`.

## B3: image workflow (one session)
`image.yml`: `on: push: branches: [main]` plus `workflow_dispatch`. Matrix of two jobs, each `docker/setup-buildx-action@v3`
then `docker/build-push-action@v6` with `push: true` and `secrets: npm_token=${{ secrets.NPM_READ_TOKEN }}` (never `build-args`):
| Job | `if` | permissions | Auth | Tag |
|---|---|---|---|---|
| `gcp` | `vars.GCP_WIF_PROVIDER != ''` (job-level `if`; skipped until the variable is set) | `contents: read`, `id-token: write` | `google-github-actions/auth@v2` with `workload_identity_provider: ${{ vars.GCP_WIF_PROVIDER }}`, `service_account: ${{ vars.GCP_SERVICE_ACCOUNT }}`; `gcloud auth configure-docker <region>-docker.pkg.dev` | `${{ vars.GCP_REGION }}-docker.pkg.dev/${{ vars.GCP_PROJECT }}/brain/brain:${{ github.sha }}` |
| `aws` | `needs: aws-gate`, `if: needs.aws-gate.outputs.enabled == 'true'`; `aws-gate` is a one-step job writing `enabled=${{ secrets.AWS_ROLE_ARN != '' }}` to `$GITHUB_OUTPUT` (job-level `if` cannot read `secrets`) | same | `aws-actions/configure-aws-credentials@v4` with `role-to-assume`, then `aws-actions/amazon-ecr-login@v2` | `<registry>/brain:${{ github.sha }}` |
`ci.yml`: in `verify`, `mutation` and `integration`, add a step that puts the newest `/usr/lib/postgresql/*/bin` on
`$GITHUB_PATH` before tests (ubuntu-latest ships one; the major changes, 16 then 18); under `CI=true` a missing Postgres
fails instead of skipping.

## Commands (each builder, from the repo root)
```
NODE_AUTH_TOKEN=$(cat <token file>) pnpm install
pnpm --filter @anvesx/graph-store test             # B1: contract + postgres + existing, all green
pnpm --filter @anvesx/deploy test                  # B2 + B3: static checks green
pnpm structure && pnpm exec biome check . && pnpm deps && pnpm turbo run build typecheck
```
Dev machines without Postgres 16 set `PG_BIN` (14+ accepted for local runs; production is 16).

## Local proof (B2 pastes the output; V reruns it)
1. `docker build --secret id=npm_token,env=NODE_AUTH_TOKEN -t company-brain:test .`
2. Start a local Postgres listening on all interfaces (the helper does it: `startPostgres({ listenAll: true })`).
3. `docker run --rm -p 8080:8080 --add-host=host.docker.internal:host-gateway -e DATABASE_URL=postgres://postgres:<pw>@host.docker.internal:<port>/postgres -e BRAIN_AUTH_SECRET=... -e IDENTITY_SECRET=... -e BASE_URL=http://brain.test company-brain:test`
4. `curl -s localhost:8080/healthz` prints `{"status":"ok"}`.
5. `NODE_AUTH_TOKEN=... pnpm --filter @anvesx/deploy integration` runs steps 1 to 4 plus sign-up, the graph read,
   503 and restart recovery, and hygiene. All 8 tests green, none skipped.

## Done
Every red test listed above green, none skipped on a machine with docker and Postgres; existing suites green;
mutation >= 80 on graph-store; the verifier's PASS with the evidence file. B2 and B3 ship as PRs and stop (A15: infra
and secrets handling are human-merge).
