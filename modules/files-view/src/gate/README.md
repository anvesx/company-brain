# src/gate

Everything that reads data goes through here, and every read is wrapped by `openGate` from `@anvesx/visibility`.

- `gate.ts`: `pgGate`, a per-request gate over the pool (`recheck`, `limits.top` 2000), with a per-request recheck memo and `removed(id)`, the check behind the "access removed" page.
- `visible.ts`: gate-approved file pages and one file. Delegates to `scan.ts` so a page fills despite hidden rows.
- `scan.ts`: keyset scan that over-fetches, gates each chunk, and stops on a recheck budget with a resumable cursor.
