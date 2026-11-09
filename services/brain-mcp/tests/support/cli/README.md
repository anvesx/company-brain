# support/cli

Helpers for the agent-CLI e2e tests in `tests/e2e`.

- `cli.ts`: `which`, `gate` (prints the skip reason, never a silent pass), `run` (bounded spawn),
  `scratch` (temp folder), `place` (writes a rendered install body), `uniqueName`.

Each CLI runs against a temp config home or working directory, so the user's own config is never read
for the assertion and never written.
