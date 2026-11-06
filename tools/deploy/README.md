# @anvesx/deploy

Tests for the deploy artefacts at the repository root: the `Dockerfile`, `.dockerignore` and
`.github/workflows/image.yml` (spec `docs/specs/infra/deploy.md`, ADR 0010).

- `pnpm test`: static checks, no docker needed.
- `pnpm integration`: builds the image and runs it against a local Postgres. Needs a running docker daemon,
  `NODE_AUTH_TOKEN` (read access to GitHub Packages) and Postgres 14+ binaries on `PATH` or in `PG_BIN`.
