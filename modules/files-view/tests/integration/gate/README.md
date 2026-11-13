# tests/integration/gate

Spec item 10: the permission gate on every read path (list, search, detail, cluster tree, members, counts),
the fail-closed recheck, `removed.test.ts` (revoked file shows the removed state, others get the plain 404), 404 equality for hidden vs missing ids, `readers` visibility, and a source grep that
fails when a route reads the store without the gate. `jwt.test.ts` runs the real `jwtAuth` against a JWKS server. Each test builds its own tenant in one real Postgres.
