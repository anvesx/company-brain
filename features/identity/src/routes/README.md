# routes

The HTTP surface, a Hono app.

- `mount.ts`: `buildRoutes`. Discovery documents, `/api/auth/*` with the guards, then the pages.
- Also mounts `POST /sign-in/google` and closes the generic OAuth sign-in doors (`login/google.ts`).
- `errors.ts`: rewrites better-auth rejections into BAD_INPUT and 403, and authorize answers into 302.
- `register.ts`: labels loopback-only clients native, and checks the exact redirect_uri before authorize.
- `validate.ts`: body reading, sign-up checks, the BAD_INPUT and 429 responses, and `addressOf` (socket address; X-Forwarded-For last hop only with `trustProxy`; else one global key).
