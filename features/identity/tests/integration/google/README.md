# tests/integration/google

"Continue with Google" through the mounted app, against the replay provider started with
`oidc: true` (discovery, signed id tokens, a key set), so better-auth verifies a real RS256 id
token exactly as it does for Google. Spec:
[google-login](../../../../../docs/specs/feature/google-login.md).

| File             | Rules                                                                                                                                       |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `signin.test.ts` | 1: button and redirect with `prompt=select_account`; 3: first user lands on /connections with one organization, returning user keeps the id |
| `link.test.ts`   | 4: verified password user is linked; unverified password user is not taken over                                                             |
| `refuse.test.ts` | 2: not configured is 404, connector is not a sign-in door; 5: unverified Google email refused; 6: rate limit                                |
| `door.test.ts`   | 4: a Google state spent on a connector callback makes no user, link or session, in test and production mode                                 |
