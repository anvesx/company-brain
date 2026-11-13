# login tests

All against a real Postgres 16 (`DATABASE_URL`) and the real local OIDC server from `features/google-identity/tests/support`.

- `harness.ts`: starts the pieces and a cookie-jar browser.
- `page.test.ts`: the sign-in page has one design-system Google button and no input.
- `identity.test.ts`: the redirect chain through the OIDC server to a session; unverified email gets none.
- `cli/`: the launcher settings and `start` with sign-in on.
- `routes.test.ts`: `/` redirects to `/sign-in` without a session; `/v1/me`; the bearer still works.
