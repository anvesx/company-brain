# src/http

Hono app, `createFilesView({ pool, gate, auth })`.

- `app.tsx`: routes `/files`, `/files/:id`, `/clusters`, `/clusters/:id`. HTML by default, JSON for `Accept: application/json`.
- `auth.ts`: `jwtAuth`, OIDC bearer verification through jose and the provider's JWKS.
- `params.ts`: strict query parsing. Unknown, repeated, oversize or control-character input and bad dates are 400.
- `models.ts`: the strict CSP, security headers and the row/page/node shapes handed to `../ui`.
