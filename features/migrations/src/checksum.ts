import { createHash } from "node:crypto";
import type { MigrationDefinition } from "./migrations/types.js";

export function checksum(migration: MigrationDefinition): string {
  const content = JSON.stringify({
    name: migration.name,
    up: migration.up,
    down: migration.down,
  });
  return createHash("sha256").update(content).digest("hex");
}
