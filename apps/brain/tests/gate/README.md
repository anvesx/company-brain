# gate tests

- `auth.test.ts`: `verify` accepts a valid token and names the caller; rejects expiry at exactly now, text around the token, a wrong-length or wrong-case signature and a token for another user or tenant.
- `access.test.ts`: `canRead` and `readableDocuments` run over a real graph store with `can-read` and `member-of` edges.
