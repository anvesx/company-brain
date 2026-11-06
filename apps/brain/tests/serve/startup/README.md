# tests/serve/startup

The pieces `serve()` runs before it listens (`src/serve/startup.ts`), each driven on its own.

- `env.test.ts`: `readEnv` names the missing variable, refuses a `DATABASE_URL` that is not a postgres URL with a host, a `BRAIN_AUTH_SECRET` under 32 characters and a `BRAIN_RETRY_MS` that is not a positive integer, and returns the cursor key derived from the secret.
- `listen.test.ts`: `listenOn` turns a taken port into `port N in use` and passes any other error through; `serve()` on a taken port ends its pool before rejecting, and logs the host and port it was asked for.
- `migrate.test.ts`: `migrateLocked` on a real Postgres waits for another holder of advisory lock 7410002, hands its connection back to the pool after success, and throws it away after a failed migration.
