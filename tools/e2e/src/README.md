# src

Helpers the specs share.

- `creds.ts`: the test secret, the port, and `mint(user, tenant)` for a signed `user:tenant:exp:hmac` bearer.
- `ui.ts`: `signIn(page, user)` fills the real sign-in form and waits for the nav.
