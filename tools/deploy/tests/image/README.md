# tests/image

- `run.test.ts`: build, run against a local Postgres through `host.docker.internal`, `/healthz` 200 and 503,
  identity sign-up, the graph API reading a seeded document with a session cookie (sign-up and seed come from
  `apps/brain/tests/serve/session.ts`, shared with the non-Docker `serve` test; 401 without a cookie, `[]` for another
  user), recovery after a Postgres restart.
- `hygiene.test.ts`: non-root, health check, the npm token absent from env, history and every file.

Owned by the lead. Builders make these pass; they do not edit them.
