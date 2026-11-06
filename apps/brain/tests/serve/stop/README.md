# tests/serve/stop

Stopping `src/serve/` early. Real process or real server and real Postgres; the only injection is a delay (see `boot-wait.test.ts`).

- `early.test.ts`: SIGTERM 10 to 50 ms after node is up, while `dist/bin.js` is still loading its modules. The process exits 0, never logs `brain listening` and leaves 0 tables behind. Needs `pnpm build` first.
- `boot-wait.test.ts`: `close()` arriving mid-boot waits for the boot. Two tests, each with a 600 ms delay injected so the boot is still running: one around the graph store (fails if `close()` stops awaiting `booting`), one around identity's `$context` (fails if `boot` stops awaiting it).
