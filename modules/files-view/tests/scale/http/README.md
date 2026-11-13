# http

- `paths.ts`: the route list the HTTP suite times.
- `server.ts`: starts the real Hono app with `jwtAuth` against a local JWKS server and `pgGate` on the given pool. Returns `{base, token, stop}`.
- `k6.js`: optional k6 script. Run with `BASE_URL` and `TOKEN` set against a live server.
