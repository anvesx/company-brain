# 0010: Deploy on Google Cloud Run with Cloud SQL Postgres; AWS as the second target

Architecture decision record (ADR) 0010. Status: proposed, 6 Nov 2026. Decided by the builder;
needs cloud credentials to become accepted.

## Context

The product must serve millions of users. Today every package runs on the Node built-in SQLite,
which is one file on one machine. The owner has Google Cloud and Amazon Web Services (AWS)
access and has ruled Supabase out.

## Decision

- Primary: Google Cloud Run (one service per app, min instances 1, concurrency 80), Cloud SQL
  for Postgres 16 with the Cloud SQL connector, Secret Manager for `CONNECTIONS_KEY`,
  `IDENTITY_SECRET` and provider client secrets, Cloud Scheduler calling the refresh service.
- Secondary: AWS App Runner, RDS for Postgres, Secrets Manager and EventBridge Scheduler, with
  the same container image. No service-specific code; the only difference is the environment.
- identity already takes a Kysely dialect; graph-store gains a Postgres dialect behind the same
  interface. SQLite stays for tests and the single-user CLI.
- One Dockerfile at the repo root, built by GitHub Actions, pushed to Artifact Registry.

## Consequences

- Nothing here can be verified without a project id and credentials; the container build and
  the Postgres integration test (local Postgres 16) are the proof until then.
- Cloud Run has no local disk that survives, so the graph store must be on Postgres before any
  deploy, not after.
