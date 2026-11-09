# tests/serve/local

Tests for the local entry in `src/serve/local/`.

- `bin.test.ts`: runs the built `dist/bin.js` (build first: `pnpm turbo run build --filter=@anvesx/brain-app`) with bad settings. Each case must print one `brain: ...` line, exit 1 (2 for a bad argument), show no stack trace and create no database.
- `config.test.ts`: more bad settings (port as hex or exponent, bad base URL, graph path that is a directory, not SQLite or read-only), each one line, exit 1, nothing created; plus `explain` for `EACCES`, SQLite errors and identity settings. `run.ts` is the shared binary runner.
- `fresh.test.ts`: `staleReason` in `run.ts` refuses to run the binary when `dist/bin.js` is missing or older than any file in `src/`, and names the build command.
