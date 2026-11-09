# tests/support/net

- `tuned.ts`: `tuned(server)` gives a test server the production keep-alive limit (`keepAliveTimeout` only) (`apps/brain/src/serve/mount.ts`), so a pooled socket is not closed by Node's 5 s default under a loaded CI machine.
