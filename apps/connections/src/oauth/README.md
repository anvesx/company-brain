# oauth

Sign-in with `arctic`'s `OAuth2Client`, the generic client that `arctic`'s GitHub and Google classes wrap. Those classes hardcode the provider hosts, so a local replay server could not stand in for them; here the same URLs are defaults and can be overridden.

- `providers.ts`: `appOf`, `manifestFor`, `providerFor` and `oauthProvider(app, ...)`. Every value comes from the manifest in the registry: the app name picks the client (`github`, `google`, or a custom `auth.app`), the manifest supplies scopes, PKCE and extra parameters. Two manifests with the same app share one client and one redirect URI; the callback finds the manifest from the pending sign-in, so `/oauth/<app>/callback` and `/oauth/<id>/callback` both work.
- `pending.ts`: sign-ins in flight, in memory, single use, 10 minute life.
- `flow.ts`: build the authorize URL, exchange the code, serialise the credential.
- `refresh.ts`: `refreshAccount(store, provider, id)` trades the stored refresh token for a new access token with arctic's `refreshAccessToken` and keeps the old refresh token unless the provider rotates it. Any failure sets the account to `needs-auth`; the credential is kept. Accounts with no refresh token (pat, admin-token, GitHub oauth apps that issue none) answer `unsupported` and are not touched.
- `routes.ts`: `GET /oauth/:provider/start` (bearer, answers 302) and `GET /oauth/:provider/callback` (the provider's redirect, answers 201 with the account).

The widening rule is checked at start and again at callback. `POST /accounts/:id/sync` calls the refresh before each sync of an oauth account.
