# oauth tests

`replay-provider.ts` is a local OAuth2 server on a free port that speaks the real protocol: authorize redirect, single-use codes, basic-auth client, PKCE S256 check, JSON tokens. `harness.ts` wires it to the real app and plays the browser.

- `github/`: the GitHub flow, and start and state handling.
- `provider-cases.test.ts`: denial, refused exchange and Google PKCE.
