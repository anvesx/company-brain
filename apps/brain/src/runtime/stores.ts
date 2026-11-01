import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { createCursorStore } from "@brain/change-cursor";
import { createSearchIndex } from "@brain/hybrid-search";
import { createRegistry } from "@brain/pointer-registry";
import type { BrainDeps } from "../types.js";

/** Registry, search index and cursor store: files under `dataDir` when set, otherwise in memory. */
export function openStores(deps: Pick<BrainDeps, "dataDir" | "cursors" | "clock">, dimension: number) {
  const { dataDir } = deps;
  if (dataDir) mkdirSync(dataDir, { recursive: true });
  const at = (name: string) => (dataDir ? join(dataDir, name) : ":memory:");
  return {
    registry: createRegistry(at("registry.db")),
    index: createSearchIndex(at("search.db"), dimension),
    cursors: deps.cursors ?? createCursorStore(at("cursors.db"), deps.clock),
  };
}
