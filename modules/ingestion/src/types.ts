import type { RuntimeDeps } from "@brain/connector-runtime";
import type { IndexService } from "@brain/index-service";

export interface IngestionDeps {
  /** Everything `createConnectorRuntime` takes except the sink, which ingestion supplies. */
  runtime: Omit<RuntimeDeps, "sink">;
  indexService: IndexService;
}

export interface IngestionCounts {
  /** Change events handed to the index (upserts and tombstones), including ones that failed. */
  emitted: number;
  /** Events the index applied as created, updated or deleted. */
  indexed: number;
  failed: number;
}

export interface Ingestion {
  runOnce(tenantId: string): Promise<IngestionCounts>;
}
