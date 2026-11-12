import type { MigrationDefinition } from "./types.js";
import { tenantPolicy } from "./types.js";

export const discovery: MigrationDefinition = {
  name: "002_discovery",
  up: [
    `CREATE TABLE cluster_build (
      id uuid PRIMARY KEY, tenant text NOT NULL, algorithm_version text NOT NULL, params jsonb NOT NULL,
      input_count integer NOT NULL CHECK (input_count >= 0), finished_at timestamptz
    )`,
    ...tenantPolicy("cluster_build"),
    `CREATE TABLE cluster (
      id uuid PRIMARY KEY, build_id uuid NOT NULL REFERENCES cluster_build(id) ON DELETE CASCADE, tenant text NOT NULL,
      view text NOT NULL, level integer NOT NULL CHECK (level >= 0), parent_id uuid REFERENCES cluster(id) ON DELETE CASCADE,
      size integer NOT NULL CHECK (size >= 0), centroid jsonb NOT NULL
    )`,
    ...tenantPolicy("cluster"),
    "CREATE INDEX cluster_build_level ON cluster (build_id, view, level)",
    `CREATE TABLE cluster_member (
      cluster_id uuid NOT NULL REFERENCES cluster(id) ON DELETE CASCADE, node_id text NOT NULL REFERENCES file(node_id) ON DELETE CASCADE,
      score double precision NOT NULL, PRIMARY KEY (cluster_id, node_id)
    )`,
    `CREATE TABLE placement (
      node_id text NOT NULL REFERENCES file(node_id) ON DELETE CASCADE, view text NOT NULL,
      cluster_path uuid[] NOT NULL, PRIMARY KEY (node_id, view)
    )`,
    `CREATE TABLE route_index (
      tenant text NOT NULL, term text NOT NULL, cluster_id uuid NOT NULL REFERENCES cluster(id) ON DELETE CASCADE,
      weight double precision NOT NULL, PRIMARY KEY (tenant, term, cluster_id)
    )`,
    ...tenantPolicy("route_index"),
    `CREATE TABLE audit_event (
      id uuid PRIMARY KEY, tenant text NOT NULL, actor text NOT NULL, action text NOT NULL,
      target jsonb NOT NULL, at timestamptz NOT NULL, prev_hash text
    )`,
    ...tenantPolicy("audit_event"),
    `CREATE TABLE review_item (
      id uuid PRIMARY KEY, tenant text NOT NULL, kind text NOT NULL, proposal jsonb NOT NULL,
      state text NOT NULL, owner text, decided_at timestamptz
    )`,
    ...tenantPolicy("review_item"),
  ],
  down: [
    "DROP TABLE review_item",
    "DROP TABLE audit_event",
    "DROP TABLE route_index",
    "DROP TABLE placement",
    "DROP TABLE cluster_member",
    "DROP TABLE cluster",
    "DROP TABLE cluster_build",
  ],
};
