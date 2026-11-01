# scale-test

k6 load test for the Brain MCP search endpoint. k6 is AGPL-3.0, so it runs as an external binary and is never imported or bundled.

Run: start the app, then `BRAIN_URL=http://127.0.0.1:3000/mcp BRAIN_TOKEN=<token> pnpm --filter @brain/scale-test scale`.

Load: ramp to 50 virtual users over 30 seconds, hold 1 minute, ramp down. Pass criteria: under 1% failed requests and p95 latency under 500 ms. k6 exits non-zero when a threshold fails.

`pnpm test` checks that the script keeps both thresholds, so they cannot be removed silently.
