# oauth

Sign-in with `arctic`'s `OAuth2Client`, the generic client that `arctic`'s GitHub and Google classes wrap. Those classes hardcode the provider hosts, so a local replay server could not stand in for them; here the same URLs are defaults and can be overridden.

- `providers.ts`: `appOf`, `manifestFor`, `reservedNames`, `providerFor` and `oauthProvider(app, ...)`. Every value comes from the manifest in the registry: the app name picks the client (`github`, `google`, or a custom `auth.app`), the manifest supplies scopes, PKCE and extra parameters. Two manifests with the same app share one client and one redirect URI; the callback finds the manifest from the pending sign-in, so `/oauth/<app>/callback` and `/oauth/<id>/callback` both work. `providerFor` also refuses any non-built-in manifest whose id or app name is reserved, so a tenant manifest never gets a server client even if a route let it through. Only built-in manifests answer to an app name; a tenant's custom manifest answers to its id, and `reservedNames` (every built-in id and app name) is what `POST /v1/catalog` refuses.
- `flow.ts`: build the authorize URL, exchange the code, serialise the credential.
- `state/`: `pending.ts` (sign-ins in flight, in memory, single use, 10 minute life) and `refresh.ts` (`refreshAccount`, see its README).
- `routes.ts`: `GET /oauth/:provider/start` (bearer, answers 302) and `GET /oauth/:provider/callback` (the provider's redirect, answers 201 with the account).

`start` sets an HttpOnly, SameSite=Lax, signed `oauth_bind` cookie (`state/binding.ts`); over https (directly or `x-forwarded-proto: https`) it is Secure and named `__Host-oauth_bind`; `callback` answers 400 without a matching one, before any token exchange. `ui/oauth-ui.ts` passes the cookie through `start-url`.

The widening rule is checked at start and again at callback. `POST /accounts/:id/sync` calls the refresh before each sync of an oauth account.
