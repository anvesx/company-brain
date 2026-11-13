# tests/auto-sync

End to end: connect through a local OAuth provider, then new upstream items reach the graph and the status
page without anyone pressing Sync now. Real Postgres (vault, cursors, pg-boss), real browser session.

| File            | Proves                                                                                     |
| --------------- | ------------------------------------------------------------------------------------------ |
| `flow.test.ts`  | connect, repo set, webhook push and poll tick sync by themselves; health shows on the page |
| `scale.test.ts` | N accounts across tenants drain through the queue; prints queue depth and p95              |
