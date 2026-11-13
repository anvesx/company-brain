# adversarial

Attack tests for `@anvesx/files-view`: tenant and zone leaks, auth bypass, injection, pagination edges, hostile
data. Real Postgres 16 and a real OIDC/JWKS HTTP endpoint (jose); no mocks. A failing test here is a real hole.

- `leaks/` permission gate, tenant isolation, auth
- `inject/` SQL, LIKE wildcards, XSS, cursor tampering, limits
- `paging/` keyset edges, concurrency, over-fetch, gate caps
- `inputs/` cycles, orphans, unicode, huge and missing metadata
- `support/` world builder (Postgres, OIDC, seed, mount). The only file that knows how `createFilesView` is wired.
