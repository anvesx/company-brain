# sync tests

`fixture.ts` boots the real app over a real graph file and a local HTTP server that answers the GitHub SDK with the recorded JSON in `services/connectors/tests/fixtures`. `route.test.ts` calls `POST /v1/accounts/:id/sync`. `disconnect.test.ts` deletes accounts and checks the graph edges. `refresh.test.ts` covers the token refresh that runs before a sync.

`errors.test.ts` checks the exact body of each refusal, the millisecond clock the edges are stamped with, and that only oauth accounts with a refresh token are refreshed.
