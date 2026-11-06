# e2e

Playwright in a real Chromium against a real `createIdentity` server (rules 9, 10, 11, 12, 16 and the
browser acceptance list). Skipped unless `PLAYWRIGHT=1`. The `e2e` script starts the server itself
(`server.ts`, port 18788, a temp SQLite file); files run one after another so each owns the port, so no other process is needed:

```sh
PLAYWRIGHT=1 pnpm --filter @anvesx/identity e2e
```

| Variable            | Default                          | Meaning                                                             |
| ------------------- | -------------------------------- | ------------------------------------------------------------------- |
| `E2E_BASE_URL`      | unset (`http://localhost:18788`) | Set it to test a server you started yourself; then none is started. |
| `E2E_MCP_URL`       | `https://brain.example.com/mcp`  | The manifest url the guide renders.                                 |
| `E2E_CHROMIUM_PATH` | unset                            | A Chromium binary, when Playwright's own is not installed.          |

- `server.ts`: `startServer()`, a real `createIdentity` over a fresh SQLite file on port 18788 (catalog: one tile; guide url `E2E_MCP_URL`). `support.ts` `startE2e()` starts it with the browser.
- `support.ts`: browser launch, a fresh user per test, screenshots into `shots/`.
- `auth.test.ts`: sign-up, sign-in, picker, connections list, sign-out.
- `guide.test.ts`: the install guide below the connections, the copy button, the docs notes.
- `passkey/`: rule 16 with a virtual authenticator (no Touch ID prompt); its own `shots/`.
