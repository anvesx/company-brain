# tokens

- `write-token-file.ts`: `writeTokenFile(store, file)` writes `BRAIN_USER_TOKENS_FILE` as `{user: {source: token}}`, mode 600, replaced atomically. The source is the provider id (`github`, `drive`), which matches the brain connector ids. Per owner and provider the oldest active account wins; `needs-auth` accounts are left out. A `company` account's token goes only to its owner, never to other users.
