# rules

The two pure pieces the store and routes lean on.

- `widen.ts`: `checkZones`, the rule that only a tenant admin makes a pat or oauth account company-wide.
- `crypto.ts`: AES-256-GCM `seal` and `open`, key parsing for `CONNECTIONS_KEY`.
