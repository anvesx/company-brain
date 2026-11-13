# accounts

- `types.ts`: `Account` (never carries a credential), zones, kinds.
- `rows.ts`: the table schema and the row to `Account` mapping. An older `secret` column is dropped on open and those accounts become `needs-auth`.
- `store.ts`: `openStore`, accounts on `node:sqlite`. Every row method takes the tenant first; a wrong tenant answers like an unknown id. `active(repo?)` lists active accounts of every tenant (ids only) for the jobs.
- `rules/`: `widen.ts` (`checkZones`, the rule that only a tenant admin makes a pat or oauth account company-wide) and `narrow.ts`.
- `health/`: failed syncs in a row, the last error, the last run and the run in progress (see its README).
