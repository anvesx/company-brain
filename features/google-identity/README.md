# @anvesx/google-identity

Google-only sign-in for Company Brain (WP-11). One "Continue with Google" button; better-auth runs
Google OIDC against the issuer in config (Google in production, a local OIDC server in tests).
There is no password, email-and-password or passkey input, route, plugin or dependency. A test fails if one appears.

- `migrateIdentity(cfg)` creates the better-auth tables in Postgres. Run it before serving.
- `createGoogleIdentity(cfg)` returns `{ auth, app }`. Serve `app.fetch` (Hono). Sessions and rate limits are rows in Postgres.
- Production (`production: true`) needs an https `baseUrl` and `trustedProxies` (the Cloud Run front end). Cookies are
  `Secure` and `__Secure-` prefixed, the client address is read from `X-Forwarded-For` past the trusted hops, and
  starting sign-in is limited to 5 per address per 15 minutes.
- Only four better-auth routes are reachable (`OPEN_ROUTES`); everything else is a 404.
- A user whose Google email is not verified never gets a user row or a session.

The old `features/identity` package still holds password and passkey code; removing it is not part of this package (see `EVIDENCE.md`).

Tests need Postgres 16: `DATABASE_URL=... pnpm --filter @anvesx/google-identity test` (`tests/support/pg-temp.sh` starts a throwaway one).
