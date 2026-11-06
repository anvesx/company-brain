# tests

The acceptance suite for `@anvesx/graph-view`, written before the code (docs/briefs/graph-view.md).
It is red until the builder lands `src/`. Builders do not edit these files; a diff that touches them is
flagged in review.

| Folder         | Runs                                           | Command                                 |
| -------------- | ---------------------------------------------- | --------------------------------------- |
| `unit/`        | `visibleGraph` on a real store file            | `pnpm --filter @anvesx/graph-view test` |
| `integration/` | Routes over real HTTP with real identity       | same                                    |
| `build/`       | dist holds an exact copy of the page scripts   | same                                    |
| `scale/`       | 10k docs / 50k edges under 300 ms (load gated) | same (skipped by Stryker)               |
| `e2e/`         | Chromium on the page                           | `pnpm --filter @anvesx/graph-view e2e`  |
| `support/`     | Shared helpers, no test files                  |                                         |
