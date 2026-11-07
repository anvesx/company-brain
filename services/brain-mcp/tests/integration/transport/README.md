# transport tests

- `mount-errors.test.ts`: exact status, JSON-RPC code and message of every error /mcp answers itself.
- `mount-routes.test.ts`: initialize answers JSON; /mcp is served, /mcpx is 404.
- `mount-limits.test.ts`: the default 1 MiB body cap and large default session cap.
- `sessions-cap.test.ts`: the RangeError message for a bad cap, and cap 1 being valid.
