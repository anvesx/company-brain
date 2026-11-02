# tokens

- `write-token-file.ts`: `writeTokenFile(store, file)` writes `BRAIN_USER_TOKENS_FILE` as `{user: {source: token}}`, mode 600, replaced atomically. `needs-auth` accounts are left out. A `company` account's token goes only to its owner, never to other users. Two keys per account:
  - `<provider>:<account id>`, the exact graph `source` that account's documents carry. `apps/brain` looks tokens up as `tokens[caller.user][doc.source]`, so a live recheck of a synced document finds the asker's own token for that account.
  - the bare provider (`github`, `drive`), for the owner's oldest active account of that provider. This is the id `brain sync` and `BRAIN_CONNECTOR` use.

  The brain mapping, in full: graph source `github:<id>` finds its token under the same key. `apps/brain` builds one connector from `BRAIN_CONNECTOR` and indexes it by that connector's id (`github`), so a document whose source is `github:<id>` has no connector there yet and is denied on live recheck. Closing that needs a change in `apps/brain` (a connector per source), which is not done here. The shape and mode rules are the brain's own; `tests/tokens/source-keys.test.ts` loads the produced file through `recheckFromEnv`.
- `rewrite.ts`: `rewriteTokens(deps)`, the one helper the routes call to rewrite the file after an account is created, patched, deleted or refreshed (and after an OAuth callback creates one). No-op without `tokensFile`.
- `access-token.ts`: `accessTokenOf`, the bearer token inside a stored credential, shared by the token file and the sync.
