# Numbered migrations

Definitions sort by their numeric prefix. Each contains both directions as canonical SQL; changing
either direction changes its SHA-256. The provider writes that digest to `schema_version` inside the
same Kysely transaction as the DDL.
