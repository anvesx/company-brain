# session

Rule 2 (cookie session, lockout) and the session half of the identity port.

- `cookie.test.ts`: HttpOnly, SameSite Lax, 7 day Max-Age; Secure only outside localhost.
- `refresh.test.ts`: a session in use is pushed out to 7 days again.
- `lockout.test.ts`: five failures per email per 15 minutes, then 429 with Retry-After; the
  counter survives a restart on the same database file.
- `port.test.ts`: `fromSession`, `fromBearer`, `require` on absent, bad and org-less callers.
