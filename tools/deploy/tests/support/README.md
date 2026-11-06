# tests/support

- `docker.ts`: `docker` CLI wrapper, `dockerSkipReason`, `buildImage` (token as a BuildKit secret), `runImage`,
  `inspectImage`, `stopContainer`. The throwaway Postgres comes from `features/graph-store/tests/support/pg/server.ts`.
- `http.ts`: `until` (poll with a deadline). The HMAC bearer is gone (ADR 0008): tests sign up and use the session cookie.
