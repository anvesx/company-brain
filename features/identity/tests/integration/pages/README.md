# pages

The server-rendered pages and form posts, driven over real HTTP like a browser.

| File                  | Rules                                                                                                     |
| --------------------- | --------------------------------------------------------------------------------------------------------- |
| `signin.test.ts`      | 2, 12: sign-in and sign-up posts, kept `oauth_query`, wrong password, lockout and weak-password messages. |
| `anonymous.test.ts`   | 2, 10: sign-in with and without a query, `/` and `/connections` redirects keep the query.                 |
| `flow.test.ts`        | 3, 7: consent allow and deny, stale query, the picker lists only your organizations.                      |
| `connections.test.ts` | 3, 11: no organization is 400, a throwing callback is a plain 400, connections or the catalog.            |
