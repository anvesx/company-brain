# scale-test

Load test for the Brain MCP search endpoint, in two forms with the same thresholds: under 1% errors and p95 under 500 ms.

## Node runner (runs here, no k6 needed)

`pnpm -r build` first, then `pnpm --filter @brain/scale-test scale:node`.

It spawns the real `apps/brain/dist/bin.js` in demo mode (`BRAIN_DEMO=1`, `BRAIN_PORT=0`, temp-dir audit DB and anchor), runs the MCP initialize handshake as `alice:acme`, then ramps connections with [autocannon](https://github.com/mcollina/autocannon) (MIT, pinned) against `tools/call search`. Each stage is checked by `evaluate` in `src/thresholds.ts`; any violation exits 1.

- `SCALE_CONNECTIONS` (default `5,25,50`): connections per stage.
- `SCALE_STAGE_SECONDS` (default `10`): seconds per stage.

autocannon reports no p95, so the runner checks p97.5. That is stricter than p95: passing it implies p95 passes.

## k6 script

k6 is AGPL-3.0, so it runs as an external binary and is never imported or bundled.

Start the app, then `BRAIN_URL=http://127.0.0.1:3000/mcp BRAIN_TOKEN=<token> pnpm --filter @brain/scale-test scale`. Load: ramp to 50 virtual users over 30 seconds, hold 1 minute, ramp down. k6 exits non-zero when a threshold fails.

`pnpm test` checks that the k6 script keeps both thresholds and unit-tests the Node evaluation.
