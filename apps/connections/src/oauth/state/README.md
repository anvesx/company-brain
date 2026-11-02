# state

- `pending.ts`: sign-ins in flight, in memory, single use, 10 minute life.
- `binding.ts`: the login-CSRF guard. `bindValue` makes the `oauth_bind` cookie value `hash(state).hmac(hash, caller)`, signed with the app secret; `bindingHolds` checks it at the callback. A state completes only in the browser that started it, so an authorize URL forwarded to someone else cannot bind their token to the sender's account.
- `refresh.ts`: `refreshAccount(store, provider, id)` trades the stored refresh token for a new access token with arctic's `refreshAccessToken` and keeps the old refresh token unless the provider rotates it. Any failure sets the account to `needs-auth`; the credential is kept. Accounts with no refresh token (pat, admin-token, GitHub oauth apps that issue none) answer `unsupported` and are not touched.
