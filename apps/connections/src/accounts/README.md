# accounts

- `types.ts`: `Account` (never carries a credential), zones, kinds.
- `widen.ts`: `checkZones`, the rule that only a tenant admin makes a pat or oauth account company-wide.
- `crypto.ts`: AES-256-GCM `seal` and `open`, key parsing for `CONNECTIONS_KEY`.
- `rows.ts`: the table schema and the row to `Account` mapping.
- `store.ts`: `openStore`, accounts on `node:sqlite` with the secret encrypted per row.
