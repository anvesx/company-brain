import { sql } from "kysely";
import type { Migration, MigrationProvider } from "kysely/migration";
import { checksum } from "../checksum.js";
import { core } from "./001-core.js";
import { discovery } from "./002-discovery.js";
import type { MigrationDefinition } from "./types.js";

export const definitions: readonly MigrationDefinition[] = [core, discovery];

function executable(definition: MigrationDefinition): Migration {
  return {
    async up(db): Promise<void> {
      for (const statement of definition.up) await sql.raw(statement).execute(db);
      await sql`INSERT INTO schema_version (version, checksum)
        VALUES (${definition.name}, ${checksum(definition)})`.execute(db);
    },
    async down(db): Promise<void> {
      await sql`DELETE FROM schema_version WHERE version = ${definition.name}`.execute(db);
      for (const statement of definition.down) await sql.raw(statement).execute(db);
    },
  };
}

export const provider: MigrationProvider = {
  async getMigrations(): Promise<Record<string, Migration>> {
    return Object.fromEntries(definitions.map((item) => [item.name, executable(item)]));
  },
};
