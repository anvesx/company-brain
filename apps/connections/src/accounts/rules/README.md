# rules

The pure pieces the store and routes lean on.

- `widen.ts`: `checkZones`, the rule that only a tenant admin makes a pat or oauth account company-wide. `liveRecheck` is a required boolean; a missing, null or non-boolean value is denied (`ok: false`, reason names `liveRecheck`).
- `narrow.ts`: `narrows`, true when a new `dataZone` is narrower than the old one (company, then personal, then private).
- `crypto.ts`: AES-256-GCM `seal` and `open`, key parsing for `CONNECTIONS_KEY`.
