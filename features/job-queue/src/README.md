# src

- `types.ts`: the `JobQueue` port, job shapes and `BackpressureError`. Callers import only this.
- `index.ts`: the public surface.
- `queue/`: the pg-boss adapter (`boss.ts` is the only file that imports the library), the worker
  wrapper, id derivation and library-to-port mappers.
- `ops/`: per-tenant backlog guard, default cron schedules, signal-driven graceful shutdown.
