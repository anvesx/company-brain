# support

- `helpers.ts`: `openStore` (real file in a temp dir, closed and removed after each test), `tmpDir`, `node` and `edge` factories, `code` (error code of a throwing call).
- `env.ts`: `withEnv`, sets env vars for one call and restores them exactly.
- `reads.ts`: statement-read counter, star-graph builder and `opts` shorthand for the reach cost tests.
- `oracle.ts`: the original one-lookup-per-node reach, built on the public API, for differential tests.
