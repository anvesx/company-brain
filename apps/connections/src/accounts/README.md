# accounts

- `types.ts`: `Account` (never carries a credential), zones, kinds.
- `rows.ts`: the table schema and the row to `Account` mapping.
- `store.ts`: `openStore`, accounts on `node:sqlite` with the secret encrypted per row. Every row method takes the tenant first; a wrong tenant answers like an unknown id.
- `secrets.ts`: `secretsOf(store)`, the one cross-tenant read, for the token-file writer only.
- `rules/`: `widen.ts` (`checkZones`, the rule that only a tenant admin makes a pat or oauth account company-wide) and `crypto.ts` (AES-256-GCM `seal` and `open`, key parsing for `CONNECTIONS_KEY`).
