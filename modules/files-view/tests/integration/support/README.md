# tests/integration/support

Shared helpers for the integration suites: a throwaway real Postgres 16 (`pg.ts`), a real local OIDC/JWKS HTTP
endpoint (`oidc.ts`), the graph seeders (`seed.ts`) and the real Hono server on an ephemeral port (`app.ts`).
No mocks, fakes or stubs. The wiring contract these helpers assume is in `app.ts`.
