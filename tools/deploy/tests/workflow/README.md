# tests/workflow

- `ci-config.test.ts`: `turbo.json` `passThroughEnv` and the CI `integration` step both carry `NODE_AUTH_TOKEN`.
- `image-workflow.test.ts`: OIDC only (no key JSON, no `GOOGLE_APPLICATION_CREDENTIALS`), Artifact Registry push,
  the GCP job gated on `vars.GCP_WIF_PROVIDER`, the AWS job gated on `secrets.AWS_ROLE_ARN`, the npm token as a BuildKit secret.
- `dockerfile.test.ts`: multi-stage, non-root `USER`, `HEALTHCHECK` on `/healthz` following `PORT`, secret mount, `.dockerignore`.

Owned by the lead. Builders make these pass; they do not edit them.
