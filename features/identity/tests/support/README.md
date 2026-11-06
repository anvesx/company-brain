# support

Helpers shared by the test folders. No test files live here.

- `db.ts`: a fresh SQLite file per call under the OS temp folder; row reads; moving a stored
  timestamp (better-auth has no injectable clock, so time travel for its rows is a row edit).
- `server.ts`: `boot()` starts `createIdentity` behind a real HTTP server on a free port, with
  a hand-moved clock, a mail collector and a per-path hit counter.
- `http.ts`: a cookie-keeping client that sends Origin on writes, plus sign-up and sign-in.
- `oauth.ts`: the MCP client steps: discovery, registration, PKCE, authorize, consent, token.
- `process/`: real second node processes on the same SQLite file, for cross-process races.
