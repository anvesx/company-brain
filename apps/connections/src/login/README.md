# login

Google-only sign-in for the page. No login input of any kind: no email, password or passkey field. (The connector-token field in the UI is a credential for a connector, not a login.)

- `page.tsx`: the sign-in page, a centered card (serif title, one `ProviderButton` from `@anvesx/design-system`, shell ground in light and dark), and the policy sources its style block needs.
- `identity.ts`: `createLogin` migrates the login tables and builds `@anvesx/google-identity`. `session(headers)` turns the session cookie into a caller: `{user: email, tenant: email}` (a personal tenant per user; admins are listed as `email:email`).
- `routes.ts`: delegates `/sign-in`, `POST /sign-in/google` and `/api/auth/*` to that app, and answers `GET /v1/me`.

The bearer stays for service callers such as the brain app; the cookie is for people in a browser. The cookie is `SameSite=Lax`, and `requireCaller` also checks the request when only the cookie authenticated it (the bearer is never checked): `Sec-Fetch-Site: cross-site` is refused with 403 on every method (this covers `oauth/:provider/start`), and a POST, PATCH or DELETE must also not come from another `Origin` than `CONNECTIONS_PUBLIC_URL`.

`/sign-in?error=email_not_verified` and `?error=state_mismatch` show a short fixed message; any other value shows nothing.

Identity: the user and the tenant are the lowercased email Google verified, not Google's `sub`. If an email address is recycled to a new person, they sign in as the same user and inherit that tenant's accounts. An admin in `CONNECTIONS_ADMINS` who signs in with Google is listed as `email:email` (user and tenant both the email).
