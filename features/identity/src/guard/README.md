# guard

Checks that run before a request reaches better-auth or a handler.

- `origin.ts`: refuses cross-origin writes and cookie writes with no Origin.
- `limits.ts`: sign-in lockout and registration rate limit, stored in the database. The registration key is the socket address (see `routes/validate.ts`).
- `bearer.ts`: verifies an access token against the cached key set. No database read per check. An unknown key id reloads the key set at most once a minute (one shared fetch), and a reload never drops tokens already proven.
- `session.ts`: reads the cookie session, finds the active organization, signs and compares CSRF tokens.
