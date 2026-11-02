# tests

Playwright specs, matched by `*.test.ts`. One worker, one server, one SQLite file per run, so each spec uses its own labels and ids.

- `creds.test.ts` and `ui.test.ts` check the helpers in `src/` against the running server and page.
- `api/` drives the HTTP API; `ui/` drives the page in Chromium.
