import type { MigrationDefinition } from "./types.js";
import { tenantPolicy } from "./types.js";

export const core: MigrationDefinition = {
  name: "001_core",
  up: [
    `CREATE TABLE schema_version (
      version text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT transaction_timestamp(), checksum char(64) NOT NULL
    )`,
    `CREATE TABLE connection (
      id uuid PRIMARY KEY, tenant text NOT NULL, owner text NOT NULL, provider text NOT NULL, scopes text[] NOT NULL,
      status text NOT NULL, zone text NOT NULL, health text NOT NULL, last_ok_at timestamptz
    )`,
    ...tenantPolicy("connection"),
    `CREATE TABLE sync_run (
      id uuid PRIMARY KEY, connection_id uuid NOT NULL REFERENCES connection(id) ON DELETE CASCADE, kind text NOT NULL,
      state text NOT NULL, started_at timestamptz NOT NULL, finished_at timestamptz, counts jsonb NOT NULL DEFAULT '{}', error jsonb
    )`,
    `CREATE TABLE sync_cursor (
      connection_id uuid NOT NULL REFERENCES connection(id) ON DELETE CASCADE, stream text NOT NULL, cursor text NOT NULL,
      updated_at timestamptz NOT NULL DEFAULT transaction_timestamp(), PRIMARY KEY (connection_id, stream)
    )`,
    `CREATE TABLE webhook_subscription (
      id uuid PRIMARY KEY, connection_id uuid NOT NULL REFERENCES connection(id) ON DELETE CASCADE,
      channel text NOT NULL, expires_at timestamptz NOT NULL, secret_ref text NOT NULL
    )`,
    `CREATE TABLE sync_error (
      id uuid PRIMARY KEY, run_id uuid NOT NULL REFERENCES sync_run(id) ON DELETE CASCADE,
      item_ref text NOT NULL, code text NOT NULL, retry_at timestamptz
    )`,
    `CREATE TABLE file (
      node_id text PRIMARY KEY, tenant text NOT NULL, connection_id uuid NOT NULL REFERENCES connection(id) ON DELETE CASCADE,
      external_id text NOT NULL, title text NOT NULL, kind text NOT NULL, path text NOT NULL, owner text NOT NULL,
      modified_at timestamptz NOT NULL, fetched_at timestamptz NOT NULL, status text NOT NULL, acl_signature text NOT NULL
    )`,
    ...tenantPolicy("file"),
    "CREATE UNIQUE INDEX file_external ON file (tenant, connection_id, external_id)",
  ],
  down: [
    "DROP TABLE file",
    "DROP TABLE sync_error",
    "DROP TABLE webhook_subscription",
    "DROP TABLE sync_cursor",
    "DROP TABLE sync_run",
    "DROP TABLE connection",
    "DROP TABLE schema_version",
  ],
};
