# tokens

- `write-token-file.ts`: `writeTokenFile(store, file)` writes `BRAIN_USER_TOKENS_FILE` as `{user: {source: token}}`, mode 600, replaced atomically. The source is the provider id (`github`, `drive`), which matches the brain connector ids. Per owner and provider the oldest active account wins; `needs-auth` accounts are left out. A `company` account's token goes only to its owner, never to other users.
- `rewrite.ts`: `rewriteTokens(deps)`, the one helper the routes call to rewrite the file after an account is created, patched, deleted or refreshed (and after an OAuth callback creates one). No-op without `tokensFile`.
- `access-token.ts`: `accessTokenOf`, the bearer token inside a stored credential, shared by the token file and the sync.
