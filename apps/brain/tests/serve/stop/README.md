# tests/serve/stop

Stopping `src/serve/` early. Real process or real server and real Postgres; the only injection is a delay (see `boot-wait.test.ts`).

- `early.test.ts`: SIGTERM 10 to 50 ms after `dist/bin.js` has registered its handler (a `newListener` preload prints the marker), while it is still loading its modules. A marker at "node is up" let the signal land before the handler under load: killed by SIGTERM, exit code null. The process exits 0, never logs `brain listening` and leaves 0 tables behind. Needs `pnpm build` first.
- `boot-wait.test.ts`: `close()` arriving mid-boot waits for the boot. Two tests, each with a 600 ms delay injected so the boot is still running: one around the graph store (fails if `close()` stops awaiting `booting`), one around identity's `$context` (fails if `boot` stops awaiting it).
- `close.test.ts`: `close()` against a database that refuses connections. No retry is logged after it returns (the interrupted attempt is not a failure), and it returns within 2 s while a client is still sending its request headers: `server.close()` alone waits for that client (measured: 3 s and still waiting), `closeAllConnections()` does not.
