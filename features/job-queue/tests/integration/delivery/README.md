# Delivery tests

Real Postgres 16, real pg-boss tables, no test doubles. They cover idempotency keys, retries with
back-off, dead letters, per-tenant back-pressure and cron schedules (one test waits for a real
minute boundary).
