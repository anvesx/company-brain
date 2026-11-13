# store

`schema.ts` creates `connector_tokens` with a forced row-level security policy on `tenant`. `tenant.ts` runs a transaction with
`app.tenant` set locally. `vault.ts` is put/get/list/remove/countIds; `rotate.ts` re-seals rows under the current key in batches.
The app must connect as a plain role: a Postgres superuser bypasses row-level security.
