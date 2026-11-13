# ops

`backlog.ts` refuses new work from a tenant already at its backlog limit. `schedules.ts` holds the
default cron table and registers it. `shutdown.ts` stops the queue gracefully on SIGTERM or SIGINT.
