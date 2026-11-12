# Integration tests

Real Postgres 16, a real node-oidc-provider server standing in for Google, and the real app on a real port. No mocks.

- `signin.test.ts`: Continue with Google end to end; sessions and users are Postgres rows; unverified email refused; sign-out.
- `no-password.test.ts`: every password, email-password and passkey route is a 404; the page has one button and no input.
- `production.test.ts`: secure cookies, security headers, trusted proxy headers and the rate limit keyed on the forwarded address.
