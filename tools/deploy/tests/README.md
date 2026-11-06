# tests

- `workflow/`: static checks of `image.yml`, the `Dockerfile` and `.dockerignore`. No daemon needed; run by `pnpm test`.
- `image/`: builds the image and runs it against a throwaway Postgres; run by `pnpm integration`. Skips with a
  printed reason when the docker daemon or `NODE_AUTH_TOKEN` is missing, except under `CI=true`, where it fails.
- `support/`: the docker CLI helpers.
