# refresh/branches

Every branch of `createRefresher` over the real database, with providers we script so each token-endpoint
answer is reachable. Written to kill the surviving mutants in `connectors/refresh.ts`.

- `kit.ts`: boots the app and replay provider, `refresherFor`, and the row and outcome helpers.
- `verdict.test.ts`: which answers mean the grant is gone, and which are an outage.
- `stored.test.ts`: rows that cannot refresh at all, and what a good refresh stores.
- `direct.test.ts`: `refreshAccount` asked directly: unknown id, needs-auth, leased, re-read under lease.
- `race/`: a refusal that races another process.
