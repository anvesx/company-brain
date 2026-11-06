# tests/integration/connectors

Connector accounts through the mounted app, a real SQLite file and the local replay OAuth
provider in `../../support/replay`. Spec:
[connector-accounts](../../../../../docs/specs/feature/connector-accounts.md); brief:
[connector-accounts](../../../../../docs/briefs/connector-accounts.md).

| File            | Rules                                                                                                                                |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `link.test.ts`  | 1: tile post, provider redirect, full flow, 404 / 403 / signed out, built-in redirect; 2: tile shows email, time, status, owner only |
| `rest.test.ts`  | 3: no token in the database file, refreshed pair sealed, wrong key fails closed, no key refuses to boot                              |
| `token.test.ts` | 4: 30 minute window, invalid_grant, provider 500, lease held, wrong owner                                                            |
| `tiles.test.ts` | 8: sign in again keeps the id; 9: unlink, stranger 404, csrf 403; 11: not configured tile                                            |
