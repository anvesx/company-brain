# tests/integration/unverified

A connector link for a signed-in person when the provider says `email_verified: false`.

| File           | Proves                                                                                      |
| -------------- | ------------------------------------------------------------------------------------------- |
| `link.test.ts` | the account row is stored and the person lands on `/connections` with no `error` in the URL |
