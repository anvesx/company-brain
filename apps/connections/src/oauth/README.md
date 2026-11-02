# oauth

Sign-in with `arctic`'s `OAuth2Client`, the generic client that `arctic`'s GitHub and Google classes wrap. Those classes hardcode the provider hosts, so a local replay server could not stand in for them; here the same URLs are defaults and can be overridden.

- `providers.ts`: `oauthProvider("github" | "google", ...)`, scopes, PKCE flag and endpoints. GitHub makes `github` accounts; Google makes `drive` accounts with `drive.readonly`, offline access and PKCE S256.
- `pending.ts`: sign-ins in flight, in memory, single use, 10 minute life.
- `flow.ts`: build the authorize URL, exchange the code, serialise the credential.
- `routes.ts`: `GET /oauth/:provider/start` (bearer, answers 302) and `GET /oauth/:provider/callback` (the provider's redirect, answers 201 with the account).

The widening rule is checked at start and again at callback. Refresh of an expired access token is not built yet.
