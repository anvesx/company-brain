# tokens tests

`write-token-file.test.ts` writes real files in a temp directory and checks content, mode 600, atomic replace of a loose file, oauth token extraction and account selection.

`tenant-keys.test.ts` checks that `t1:ana` and `t2:ana` get separate entries, that tenant and user are encoded against path traversal, and that the brain uses the same key function.

`access-token.test.ts` covers every shape of stored credential, valid and broken, that `accessTokenOf` can be handed.
