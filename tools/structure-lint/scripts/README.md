# scripts

`stryker-ipc.cjs` is preloaded through `NODE_OPTIONS` by `pnpm mutation`. It replaces only Stryker's
worker-log socket (`net.createServer` and `net.createConnection`) with an in-memory sink so
mutation testing also runs in CI sandboxes that forbid listeners. Worker control still uses process
IPC. It is never loaded by the linter or the tests.
