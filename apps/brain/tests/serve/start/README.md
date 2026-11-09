# tests/serve/start

Start-up behaviour of `src/serve/`. Real server and real Postgres, no mocks.

- `errors.test.ts`: which errors `isTransient` retries (connection errors, a migration race) and which are fatal.
- `process.test.ts`: the real `dist/bin.js` exits 1 with `brain: <message>` for a short secret, a taken port and a wrong password; refused connections keep retrying with one pool `error` listener; two boots on a fresh database race cleanly. Needs `pnpm build` first.
- `signal.test.ts`: SIGTERM at +0 to +250 ms after the `listening` line (around the end of the migration), exits 0 with no ERROR line or stack, and the next boot of that database finishes migrating. A missing `dist/bin.js` fails the run (never skips); no Postgres skips only outside CI, with a `SKIPPED:` line.
- `input.test.ts`: a non-integer `BRAIN_RETRY_MS` and a `DATABASE_URL` that is not a postgres URL with a host exit 1 with one line. Needs `pnpm build` first.
