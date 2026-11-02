# data

- `repo.ts`: the owner/name rule shared with the account validation.
- `disconnect.ts`: `disconnect` closes the account's `can-read` and `member-of` edges with `edgesBySource`, then removes the account and rewrites the token file. Documents stay in the graph with no readers from that account.

The sync route and the accounts routes both import from here.
