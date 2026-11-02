# tokens tests

`write-token-file.test.ts` writes real files in a temp directory and checks content, mode 600, atomic replace of a loose file, oauth token extraction and account selection.

`access-token.test.ts` covers every shape of stored credential, valid and broken, that `accessTokenOf` can be handed.
