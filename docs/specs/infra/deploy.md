# Spec: deploy (Postgres graph store, container image, image workflow)

Ticket: #<n>   Tier: feature (graph-store) + app (brain serve entry) + tool (deploy tests)   Milestone: M3
ADR: [0010](../../adr/tooling/0010-deploy-cloud-run-postgres.md). Briefs: [docs/briefs/deploy.md](../../briefs/deploy.md).

Exact source: repository tooling and ADR 0010, not a company-brain requirement.

## Purpose
Cloud Run keeps no disk, so the graph store must live in Postgres before any deploy (ADR 0010). This slice
gives graph-store a Postgres 16 dialect, one root Dockerfile that runs the brain app with identity mounted, and a
GitHub Actions workflow that pushes the image with short-lived OIDC credentials only. The deploy itself is out of scope.

## Reuse decision
| Need | Pick | Licence | Why |
|---|---|---|---|
| Postgres driver | `pg@8.23.1` (+ `@types/pg@8.23.1`) | MIT | The driver better-auth and kysely's `PostgresDialect` already use; one `Pool` serves both. |
| Identity on Postgres | `@anvesx/identity` as is | MIT | `IdentityConfig.database` is `BetterAuthOptions["database"]`: it already takes `{ dialect: new PostgresDialect({ pool }) }` (kysely 0.29.8) or a `pg.Pool`. No identity change. |
| Workflow parsing in tests | `yaml@2.9.1` | ISC | Already in the lockfile. |
| Image build in CI | `docker/build-push-action@v6`, `google-github-actions/auth@v2`, `aws-actions/configure-aws-credentials@v4`, `aws-actions/amazon-ecr-login@v2` | MIT / Apache-2.0 | The vendors' own OIDC actions. |

Thin code we write: the Postgres store (DDL plus the same SQL as SQLite, `$n` placeholders), `toAsync`, the brain
`serve` entry with `/healthz`. No ORM, no query builder: the SQL is a dozen hand-written statements already.

## Public interface
```ts
// features/graph-store/src/index.ts, new exports
/** The GraphStore contract with every method returning a Promise. Errors are rejected GraphErrors, never sync throws. */
export type AsyncGraphStore = { [K in keyof GraphStore]: (...a: Parameters<GraphStore[K]>) => Promise<Awaited<ReturnType<GraphStore[K]>>> };
/** Wrap the sync SQLite store; a sync throw becomes a rejection. */
export function toAsync(store: GraphStore): AsyncGraphStore;
/** Create the tables if missing (under an advisory lock) and return the store. Rejects if the database is unreachable. */
export function createPostgresGraphStore(opts: { pool: pg.Pool }): Promise<AsyncGraphStore>;
```
The "dialect factory" is the caller's `pg.Pool`: the composition root (`apps/brain/src/serve.ts`) builds one Pool from
`DATABASE_URL` and hands it to `createPostgresGraphStore({ pool })` and to identity as `{ dialect: new PostgresDialect({ pool }) }`.
Error codes stay `BAD_INPUT | DEPTH_LIMIT | CLOSED`.

Brain HTTP: `GET /healthz` (no auth) runs `select 1` on the pool with a 2 s timeout: `200 {"status":"ok"}` or
`503 {"status":"unavailable"}`. Identity routes are mounted under `/api/auth/*` and `/.well-known/*`; `/v1/*` is unchanged.
Env: `DATABASE_URL`, `BRAIN_AUTH_SECRET` (32+), `IDENTITY_SECRET` (32+), `BASE_URL`, `PORT` (default 8080), `HOST` (default `0.0.0.0`).
Start-up errors: a short `BRAIN_AUTH_SECRET`, a taken port, or any database error that is not a connection error (wrong password, bad SQL) exits 1 with `brain: <message>`; connection errors retry while `/healthz` answers 503.

## Behaviour
1. Same rows on both dialects: every row carries `tenant`; nodes and edges are bitemporal (`valid_from`, `valid_to`,
   `NULL` = current); a partial unique index allows one current row per `(tenant, id)` and per `(tenant, from, to, kind)`.
   Time columns are `double precision` so fractional, negative and `Number.MAX_VALUE` instants survive.
2. Concurrent writers on one tenant: `upsertNode` takes `pg_advisory_xact_lock(hashtext(tenant), hashtext(id))` inside its
   transaction, so two instances writing the same id serialise. History stays a contiguous chain, exactly one current row,
   no 23505 surfaces to the caller. An `at` earlier than the current row's `valid_from` rejects `BAD_INPUT`, as on SQLite.
3. `addEdge` is `INSERT ... ON CONFLICT (tenant, from_id, to_id, kind) WHERE valid_to IS NULL DO NOTHING`: twenty racing
   adds leave one current edge.
4. Huge props: the existing caps hold on both dialects (32 keys, 1024 bytes per value, 4096 bytes total, title 512 bytes,
   forbidden body keys); a value exactly at a cap round-trips; one byte over rejects `BAD_INPUT` and writes nothing.
5. Unicode: titles and ids round-trip byte-exact (CJK, emoji ZWJ sequences, RTL, combining marks); NFC and NFD forms are
   different ids. New on both dialects: a NUL character or a lone surrogate in any text field (tenant, id, kind, source,
   address, title, version, prop keys and values, edge fields, read arguments) rejects `BAD_INPUT` (Postgres text cannot
   hold NUL; `String.prototype.isWellFormed` catches surrogates).
6. Restart mid-transaction: a backend killed inside a write rolls back; the call rejects; history is unchanged; the next
   call succeeds on a fresh connection. A server restart under a live pool does not crash the process: the store attaches
   `pool.on("error")` so dropped idle clients are logged, not thrown, and calls work again once the server is back.
7. An unreachable database makes `createPostgresGraphStore` reject (it never hangs past the pool's connect timeout).
8. Five instances starting at once all succeed: DDL runs under `pg_advisory_xact_lock` (a bare `CREATE TABLE IF NOT EXISTS`
   race raises 23505 on `pg_type`). `close()` never ends the caller's pool; afterwards every call rejects `CLOSED`.
9. `/healthz` answers 200 while the database answers, 503 while it does not, and the process stays up either way.
10. The image: multi-stage, `node:26-slim`, pnpm 8.15.0, runs as the non-root `node` user from `/app`, `EXPOSE 8080`,
    `HEALTHCHECK` on `/healthz` (on `${PORT:-8080}`). No host `dist/`, `node_modules`, `.git`, `.env*` or `*.db` enters the context.
11. The npm token reaches `pnpm install` only through `RUN --mount=type=secret,id=npm_token`; it is in no ARG, ENV,
    layer, history entry or file of the final image.
12. The workflow holds no long-lived key: GCP through workload identity federation (`id-token: write`), AWS through
    `role-to-assume`; the GCP job runs only when `vars.GCP_WIF_PROVIDER` is set, the AWS job only when `secrets.AWS_ROLE_ARN` is set (a gate job reports it). The `integration` CI step and turbo's `passThroughEnv` carry `NODE_AUTH_TOKEN`. Node and pnpm versions match `ci.yml`.

## Acceptance tests (written first)
- contract (both dialects, one `describe` per factory): `features/graph-store/tests/contract/{nodes,edges,reach,limits}.test.ts`. Rules 1, 4, 5, 8 (close).
- postgres only: `features/graph-store/tests/postgres/concurrency.test.ts` (2, 3, 8), `restart.test.ts` (6, 7).
- static: `tools/deploy/tests/workflow/{image-workflow,dockerfile}.test.ts` (10 to 12).
- image: `tools/deploy/tests/image/{run,hygiene}.test.ts` (9 to 11), real image against a throwaway Postgres.
- Real servers only: `features/graph-store/tests/support/pg/server.ts` runs `initdb` + `pg_ctl` on a free port in a temp
  dir. Postgres or docker missing: skip with a printed reason; under `CI=true`: fail.
- mutation: graph-store keeps break 80 (`src/postgres/**` included).

## Layout
- `features/graph-store/src/postgres/{README.md,store.ts,schema.ts,nodes.ts,edges.ts,reach.ts}`, `src/async.ts`.
- `apps/brain/src/serve/{README.md,serve.ts,health.ts,mount.ts}`; `app.ts` and `gate/access.ts` move to `AsyncGraphStore`.
- `Dockerfile`, `.dockerignore`, `.github/workflows/image.yml` at the root; `tools/deploy/` holds their tests.
Each file under 80 lines, each folder at most 5 files plus its README.

## Out of scope
The cloud deploy itself (no project id or credentials yet), Cloud SQL connector and Secret Manager wiring, Terraform,
moving graph-sync and the CLI writes to Postgres (follow-up; they stay on sync SQLite), App Runner.
