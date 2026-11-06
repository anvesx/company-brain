# tests/support

- `docker.ts`: `docker` CLI wrapper, `dockerSkipReason`, `buildImage` (token as a BuildKit secret), `runImage`,
  `inspectImage`, `stopContainer`. The throwaway Postgres comes from `features/graph-store/tests/support/pg/server.ts`.
- `http.ts`: `bearer` (a brain API token signed with the test secret) and `until` (poll with a deadline).
