# state

- `pending.ts`: sign-ins in flight, in memory, single use, 10 minute life.
- `binding.ts`: the login-CSRF guard (`isSecure` and `bindCookie` pick the `__Host-oauth_bind` name over https). `bindValue` makes the `oauth_bind` cookie value `hash(state).hmac(hash, caller)`, signed with the app secret; `bindingHolds` checks it at the callback. A state completes only in the browser that started it, so an authorize URL forwarded to someone else cannot bind their token to the sender's account.

Token refresh moved to `src/tokens/refresh.ts` (the vault's lease replaces the old in-process single flight).
