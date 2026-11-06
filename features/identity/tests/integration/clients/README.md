# clients

MCP client registration, authorization errors, revocation, and browser write protection.

- `register.test.ts`: rule 5: open dynamic registration, loopback and https redirects, 20 per
  hour per address, static clients from config.
- `authorize.test.ts`: rules 6 and 13: PKCE S256 only, the resource must be the brain's, the
  redirect must match, the verifier must be present and right.
- `revoke.test.ts`: rule 11: sign-out deletes the session row; revoking a client kills its
  refresh tokens and leaves other clients alone.
- `csrf.test.ts`: rule 12: form tokens bound to the session; Origin checked on every write.
