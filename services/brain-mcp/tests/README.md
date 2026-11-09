# tests

The acceptance suite for brain-mcp, written before the code. Builders do not edit `unit/`,
`integration/`, `scale/` or `e2e/`; a change there needs the lead's sign-off.

- `unit/`: zod schemas, error mapping, session store, visibility point check.
- `integration/`: the real SDK client against the booted server with real identity tokens.
- `scale/`: brain.search p99 at 100k nodes and tools/list latency, both printed.
- `e2e/`: the real agent CLIs read the rendered install configs.
- `support/`: boot, users, client, graph fixtures and CLI helpers.

No mocks, no `:memory:` outside unit (fake-guard). Every store and identity database is a temp file.
