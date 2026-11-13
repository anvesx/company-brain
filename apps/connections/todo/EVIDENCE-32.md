# EVIDENCE-32: auto-sync pipeline (WP-32)

Branch `wp/32-auto-sync` from c0fa354, app `apps/connections`. Environment: Postgres 16 on 127.0.0.1:55498 (temp data dir), Node 26,
`PATH=/opt/homebrew/opt/postgresql@16/bin:$PATH NODE_AUTH_TOKEN=x LC_ALL=en_US.UTF-8 DATABASE_URL=postgres://postgres@127.0.0.1:55498/postgres`.

## What now happens without a click

1. Connect (OAuth callback) seals the token in the Postgres vault and queues `connections.sync`.
2. Setting or changing the repo queues a sync. A signed GitHub push or issues webhook queues a sync for every active account naming that repo.
3. A cron job on `connector.poll` (default every 15 minutes) queues every active account whose change cursor is older than the interval.
4. A failed sync throws, pg-boss retries with backoff (4 retries, 5 s up to 10 min), then dead-letters to `connections.sync_dlq`; the account's health reads `gave up after 5 tries`.
5. A provider 401 (or 403) triggers one refresh and a retry; still rejected means the account flips to needs-auth and the page shows Needs reconnect.
6. The account page and the directory read the real health record (Syncing, Healthy, Error, last run, items).

## Gate results (run from apps/connections unless noted)

```
pnpm test -- --coverage            exit 0
 Test Files  57 passed (57)
      Tests  277 passed (277)
Statements   : 96.93% ( 1328/1370 )
Branches     : 90.26% ( 844/935 )
Functions    : 95.23% ( 320/336 )
Lines        : 99.07% ( 1071/1081 )

npx tsc --noEmit                   exit 0
npx biome check apps/connections   Checked 219 files in 39ms (src and tests). No fixes applied.      (repo root)
pnpm structure                     checked 26 packages, 1264 files, 352 folders      (repo root, exit 0)
pnpm guard:fakes                   checked 869 files, 4 findings, 1 baselined        (repo root)
pnpm deps                          no dependency violations found (1249 modules, 2998 dependencies cruised)
```

## Required end to end (tests/auto-sync/flow.test.ts, passes)

Real Postgres (vault, cursors, pg-boss), real browser session through a local OIDC server, local OAuth2 replay provider, local GitHub replay.
Sync now is never pressed. Steps asserted:

- connect via the OAuth replay, set the repo: node `github:<id>/README.md` appears in the graph by itself and the page shows Healthy, items above 0, no "Not yet synced"
- a webhook with a wrong signature gives 401; a signed push gives `{queued:1}`; the new file `docs/new.md` appears in the graph; a redelivery of the same delivery id gives `{queued:0}`
- clock moved past the poll bucket, `jobs.tick()` returns `queued:1`; `docs/polled.md` appears; failures 0; page still Healthy

Needs-reconnect and failure states are shown in `tests/e2e/drive-oauth.test.ts` (rejected Drive token gives 409, status needs-auth, health error mentions reconnect),
`tests/ui/flow.test.ts` (Error, Syncing, Needs reconnect labels) and `tests/jobs/handler.test.ts` (dead-letter text).

## Scale note (tests/auto-sync/scale.test.ts, measured on this laptop, load average about 4)

```
SCALE accounts=120 tenants=12 concurrency=2/tenant first_tick_accepted=48 first_tick_refused=72 accepted_total=120 drained=120 total_ms=3923 p50_ms=1969 p95_ms=2985
```

120 accounts over 12 tenants, the backlog limit is 4 per tenant (below the 10 accounts each), so the first `tick()` accepts 48 and refuses 72 (the limit is hard inside one batch), later ticks pick up the rest, all 120 are queued exactly once and drained with no dead letters in about 4 s.
Latency is time from tick to the account's health `lastRunAt` seen by a 50 ms poll, against a local replay GitHub, so it measures the queue and the vault and SQLite writes, not GitHub.
Extrapolation is not measured: 1M users was not run. The queue and vault are Postgres; the account store, graph and cursor store are SQLite files, so one process is the limit of this build.

## What I did NOT cover or did not do

- `features/token-refresh` is not used: the vault's own `refreshOne` plus `httpExchange` does the refresh, gated by `tokenFor` on expiry.
- `apps/brain` still reads `BRAIN_USER_TOKENS_FILE`, and nothing writes that file now: apps/connections has no write of it (grep clean) and the plaintext token files are deleted. Until WP-33 rewires apps/brain to read tokens through the vault, the brain's live recheck gets no user tokens. I did not touch apps/brain; that is WP-33.
- No webhook auto-registration on GitHub; the operator adds the webhook and sets `CONNECTIONS_GITHUB_WEBHOOK_SECRET`. Only GitHub webhooks exist; Drive and others rely on the poll.
- 401 vs 403 (fixed for GitHub): the published connectors map both to FORBIDDEN and drop the status, so `tokens/probe.ts` asks GitHub `GET /user`. Live token = 403 = account stays active, health says denied, route 403, no retry. Dead token = needs-reconnect. Drive and other providers have no probe and still read any FORBIDDEN as reject.
- Incremental listing NOT done (not cheap): the connector `list(cursor)` cursor is page position, not a change feed, and GitHub tree listing has no since-parameter in the published connectors. The change-cursor is a last-success watermark that lets the poll skip fresh accounts; it does not narrow the provider query.
- Teardown flake 57P01 (tests/login/identity.test.ts): reproduced at base c0fa354 (1 of 6 runs exit 1, 2 error lines). Fix: `pool.on("error")` in features/google-identity/tests/support/db.ts, since DROP DATABASE WITH (FORCE) resets idle clients.
- The dead-letter state is the `connections.sync_dlq` queue plus health text; there is no UI to replay dead letters.
- pg-boss `depth().queued` is a cached statistic, so the scale test no longer reports a queue peak; it asserts the accepted and refused counts from `tick()` and no dead letters.
- Cron granularity is one minute; poll interval is at most 59 minutes.
- Old accounts that had a `secret` column are marked needs-auth on first open (users reconnect); no automatic migration of old encrypted secrets into the vault.
- Not run: mutation tests (Stryker), a real GitHub or Google, real webhooks over the internet, multi-replica run (two replicas share keys by design, one process tested).
