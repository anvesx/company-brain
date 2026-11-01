import type { Connector } from "@brain/connector-kit";
import type { Failure, RuntimeDeps } from "@brain/connector-runtime";
import type { IndexService } from "@brain/index-service";

export interface IngestionDeps {
  /** Everything `createConnectorRuntime` takes except the connector and the sink, which ingestion supplies. */
  runtime: Omit<RuntimeDeps, "sink" | "connector">;
  indexService: IndexService;
  /** The connector bound to this tenant, or undefined when the tenant is unknown. Never share one across tenants. */
  connectorFor(tenantId: string): Connector | undefined;
  /** The credential bound to this tenant, or undefined when the tenant is unknown. */
  tokenFor(tenantId: string): string | undefined;
}

export interface IngestionCounts {
  /** Change events handed to the index (upserts and tombstones), including ones that failed. */
  emitted: number;
  /** Events the index applied as created, updated or deleted. */
  indexed: number;
  failed: number;
  /** Documents whose upsert or delete was rejected in this run. Empty means the run fully succeeded. */
  failures: Failure[];
  /** Documents given up on after repeated failures; skipped until a new version or ACL arrives. */
  quarantined: Failure[];
}

export interface Ingestion {
  /** Throws `IngestionError` `UNKNOWN_TENANT` when no connector or token is bound to the tenant. */
  runOnce(tenantId: string): Promise<IngestionCounts>;
}
