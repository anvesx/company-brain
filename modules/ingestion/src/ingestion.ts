import { contentHash } from "@brain/connector-kit";
import { type ChangeEvent, createConnectorRuntime, RuntimeError } from "@brain/connector-runtime";
import { watchListing } from "./listing.js";
import { toPointer } from "./pointer.js";
import type { Ingestion, IngestionCounts, IngestionDeps } from "./types.js";

export function createIngestion({ runtime, indexService }: IngestionDeps): Ingestion {
  const { connector } = runtime;
  /** tenant -> (pointer id -> address) of documents this process indexed and has not deleted. */
  const known = new Map<string, Map<string, string>>();
  const knownFor = (tenantId: string) => known.get(tenantId) ?? known.set(tenantId, new Map()).get(tenantId)!;

  async function reap(tenantId: string, listed: Map<string, unknown>, counts: IngestionCounts) {
    const mine = knownFor(tenantId);
    for (const [id, address] of [...mine]) {
      if (listed.has(address)) continue;
      counts.emitted++;
      try {
        await indexService.apply({ type: "delete", tenantId, id, at: new Date(runtime.clock()).toISOString() });
        mine.delete(id);
        counts.indexed++;
      } catch {
        counts.failed++;
      }
    }
  }

  return {
    async runOnce(tenantId) {
      const counts: IngestionCounts = { emitted: 0, indexed: 0, failed: 0 };
      const { watched, listed, sawEverything } = watchListing(connector);
      const sink = async (event: ChangeEvent) => {
        counts.emitted++;
        try {
          const meta = listed.get(event.address);
          if (!meta) throw new Error(`no listing for ${event.address}`);
          const { text } = await connector.fetch(event.address, { token: "ingestion" });
          const pointer = toPointer(event, meta, contentHash(text));
          const result = await indexService.apply({ type: "upsert", pointer });
          knownFor(tenantId).set(pointer.id, event.address);
          if (result.outcome !== "unchanged") counts.indexed++;
        } catch (error) {
          counts.failed++;
          throw error;
        }
      };
      try {
        await createConnectorRuntime({ ...runtime, connector: watched, sink }).runOnce(tenantId);
      } catch (error) {
        if (error instanceof RuntimeError && error.code === "SINK_FAILED") return counts;
        throw error;
      }
      if (sawEverything()) await reap(tenantId, listed, counts);
      return counts;
    },
  };
}
