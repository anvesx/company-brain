# oauth

Sign-in with `arctic`'s `OAuth2Client`, the generic client that `arctic`'s GitHub and Google classes wrap. Those classes hardcode the provider hosts, so a local replay server could not stand in for them; here the same URLs are defaults and can be overridden.

- `providers.ts`: `appOf`, `manifestFor`, `providerFor` and `oauthProvider(app, ...)`. Every value comes from the manifest in the registry: the app name picks the client (`github`, `google`, or a custom `auth.app`), the manifest supplies scopes, PKCE and extra parameters. Two manifests with the same app share one client and one redirect URI; the callback finds the manifest from the pending sign-in, so `/oauth/<app>/callback` and `/oauth/<id>/callback` both work.
- `flow.ts`: build the authorize URL, exchange the code, serialise the credential.
- `state/`: `pending.ts` (sign-ins in flight, in memory, single use, 10 minute life) and `refresh.ts` (`refreshAccount`, see its README).
- `routes.ts`: `GET /oauth/:provider/start` (bearer, answers 302) and `GET /oauth/:provider/callback` (the provider's redirect, answers 201 with the account).

The widening rule is checked at start and again at callback. `POST /accounts/:id/sync` calls the refresh before each sync of an oauth account.
