# state

- `pending.ts`: sign-ins in flight, in memory, single use, 10 minute life.
- `refresh.ts`: `refreshAccount(store, provider, id)` trades the stored refresh token for a new access token with arctic's `refreshAccessToken` and keeps the old refresh token unless the provider rotates it. Any failure sets the account to `needs-auth`; the credential is kept. Accounts with no refresh token (pat, admin-token, GitHub oauth apps that issue none) answer `unsupported` and are not touched.
