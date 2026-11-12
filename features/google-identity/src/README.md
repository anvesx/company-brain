# Source

`config.ts` validates settings with zod. `auth.ts` builds better-auth (Google OIDC, Postgres sessions, secure cookies, proxy trust).
`app.ts` is the Hono app: the one-button page and the route allow-list; `index.ts` is the public surface.
