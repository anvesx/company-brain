# seal

`seal.ts`: `<kid>.<base64(nonce|tag|ciphertext)>`; the row id is the GCM additional data, so a value moved to another row fails to open.
`keyring.ts`: parses `CONNECTOR_VAULT_KEYS` (`kid:hex64,...`, first entry seals), refuses a key equal to `BRAIN_AUTH_SECRET`.
