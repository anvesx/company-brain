# login

Google-only sign-in for the page. No email, password or passkey input exists anywhere.

- `page.tsx`: the sign-in page, one `ProviderButton` from `@anvesx/design-system`, and the policy sources its style block needs.
- `identity.ts`: `createLogin` migrates the login tables and builds `@anvesx/google-identity`. `session(headers)` turns the session cookie into a caller: `{user: email, tenant: email}` (a personal tenant per user; admins are listed as `email:email`).
- `routes.ts`: delegates `/sign-in`, `POST /sign-in/google` and `/api/auth/*` to that app, and answers `GET /v1/me`.

The bearer stays for service callers such as the brain app; the cookie is for people in a browser. The cookie is `SameSite=Lax`, so a cross-site page cannot make a state-changing call with it.
