# sync tests

`fixture.ts` boots the real app over a real graph file and a local HTTP server that answers the GitHub SDK with the recorded JSON in `services/connectors/tests/fixtures`. `route.test.ts` calls `POST /v1/accounts/:id/sync`.

`errors.test.ts` checks the exact body of each refusal, the millisecond clock the edges are stamped with, and that only oauth accounts with a refresh token are refreshed.

`gate.ts` is a pass-through proxy that can hold requests, so a test can change an account while its sync is mid-flight (`bootSync(extra, routes, true)` routes the adapter through it).

`lifecycle/` holds disconnect, narrowing, the narrowing race and refresh.
