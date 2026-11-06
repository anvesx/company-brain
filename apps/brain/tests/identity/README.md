# tests/identity

Frozen contract for the move from the hand-signed HMAC bearer to identity's port (ADR 0008). The
builder makes these green and does not edit them.

| File                | What it pins                                                                                                    |
| ------------------- | --------------------------------------------------------------------------------------------------------------- |
| `boot.ts`           | Real brain app on a free port with real identity, a temp graph file and a temp auth database.                   |
| `documents.test.ts` | `/v1/documents` answers a session cookie and an MCP bearer; anything else is 401 + challenge.                   |
| `graph.test.ts`     | The brain mounts the graph view: `/v1/graph` and `/graph` on the same origin as identity.                       |
| `bad-input.test.ts` | A NUL in a `/v1/documents/:id` is 400 `bad_input` (app-wide `onError`), not 500; odd ids and cursors never 500. |
