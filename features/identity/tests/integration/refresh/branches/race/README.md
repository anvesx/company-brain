# refresh/branches/race

A refusal while another process rewrites the row.

- `gate.ts`: the racing adapter wrapper, the refusing provider and the per-test reset.
- `lost.test.ts`: the token was rotated, or the row vanished.
- `marked.test.ts`: the row was marked needs-auth, lost its access token or its updatedAt.
