# Test support

`db.ts` makes one disposable Postgres database per file. `oidc/` holds node-oidc-provider acting as Google. `app.ts` wires the
real app, database and OIDC server on real ports. `browser.ts` is a cookie jar that follows redirects. `pg-temp.sh` starts Postgres 16.
