# ui tests

Drive the real pages over HTTP with a cookie-jar browser. Sign-in is the real Google-identity app on Postgres 16 with the local OIDC server; Connect uses the local OAuth2 provider from `tests/oauth`; sync reads local GitHub JSON into a real graph file. Page tests skip without `DATABASE_URL` and fail in CI.

- `harness.ts`: boots all of that on one port and hands out signed-in browsers.
- `flow.test.ts`: add, consent, callback, repository, sync, disconnect, and the error, syncing and reconnect states.
- `guard.test.ts`: no session, cross-site posts, unknown providers, a denied sign-in, sign out.
- `model.test.ts`: counts, times and the state ranking, no server needed.
- `pages/`: the launcher redirect and `lastSyncAt`.
