# oauth tests

`replay-provider.ts` is a local OAuth2 server on a free port that speaks the real protocol: authorize redirect, single-use codes, basic-auth client, PKCE S256 check, JSON tokens. `harness.ts` wires it to the real app and plays the browser. The tests cover the GitHub flow (`github.test.ts`), start and state handling (`github-state.test.ts`) and denial, refused exchange and Google PKCE (`provider-cases.test.ts`).
