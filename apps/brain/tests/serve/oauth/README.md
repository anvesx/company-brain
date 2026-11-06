# tests/serve/oauth

- `bearer.test.ts`: on `serve()` over Postgres, `/v1/documents` answers an MCP OAuth bearer identity issued (the real sign-up, register, authorize, consent and token flow) with the person's documents, and a forged or tampered bearer with 401 and the `www-authenticate` challenge. The SQLite brain's twin is `tests/identity/documents.test.ts`.
